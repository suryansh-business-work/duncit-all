# Chat service

Every chat surface the server runs, grouped in one folder so it can be split
into its own deployable later. **Today it is not a separate process**:
`server/src/index.ts` and `server/src/modules/index.ts` mount it in-process,
on the same HTTP server, GraphQL schema and Socket.IO instance as everything
else. Nothing about its behaviour, schema or socket protocol changed when it
moved here.

| Folder     | What it is                                                         | Collections                                             |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `rooms/`   | Pod and club group chat (one `PodMessage` collection for both), replies, @-mentions, per-member mute and read marks | `PodMessage`, `ChatMute`, `ChatReadState`, `ChatNotifyClaim` |
| `staff/`   | Employee-to-employee direct messages, presence and WebRTC calls    | `StaffMessage`, `StaffCall`, `StaffChatState`           |
| `support/` | Member-to-support-agent chat, AI first reply, unified ticket list  | `SupportChatSession`, `SupportChatMessage`              |

## What it exports

`index.ts` is the mount surface — only the server entry points import it:

- GraphQL: `chatTypeDefs` / `chatResolvers`, `staffChatTypeDefs` /
  `staffChatResolvers`, `supportChatTypeDefs` / `supportChatResolvers`
  (spliced into `typeDefs` / `resolvers` in `modules/index.ts`, same order as
  before the move).
- Sockets: `attachChatHandlers`, `attachStaffChatHandlers`,
  `attachSupportChatHandlers` (called once the Socket.IO server is up).
- Schedulers: `startChatRetentionScheduler` (cluster-wide hourly sweep that
  deletes pod chat past its retention window and club chat past its cut-off).

Code elsewhere in the server that needs one model or helper imports it by its
own path through the `@microservices/*` alias, not through the barrel, so a
model import never loads every resolver and socket with it. Current consumers:

| Consumer                                                   | Uses                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `modules/content/report/report.message.ts`                 | `PodMessageModel`, `assertRoomMember`, `roomOfMessage`, `socketRoomOf`, `shapeMessage`, lazy `emitToRoom` |
| `modules/support/ticket/ticket.service.ts`                 | `emitToSupportAgents`, `emitToSupportUser`, `ticketNo`                              |
| `modules/support/ticket/ticket.fromStore.ts`, `modules/support/bouncer/bouncer.service.ts`, `modules/platform/mailAutomation/mailAutomation.tickets.ts`, `scripts/migrate-bouncer-ticket-no.ts` | `ticketNo` |
| `modules/platform/analytics/entity/support.data.ts`        | `SupportChatSessionModel`                                                           |
| `utils/hidden.ts`                                          | `STAFF_ROLES`                                                                       |

## What it depends on in the rest of the server

- Models: `Pod`, `PodMember`, `Club`, `ClubFollower`, `User`, `UserBlock`,
  `AppSettings` (via `platform/settings`), plus support's `Ticket` and
  `Bouncer` models for the unified ticket list.
- Pod lifecycle helpers (`pods/pod/pod.lifecycle`) for when a room closes.
- Moderation: `moderation/moderation.rules` screens every room message.
- Notification push: `engagement/notification/notification.service`, loaded
  lazily by `rooms/chat.notify.ts` (new room messages) and
  `support/supportChat.notify.ts` (support replies to the customer). Each push
  is claimed once per message in `ChatNotifyClaim` (unique key, 48h TTL), so a
  retry never pushes twice; muted members are skipped unless @-mentioned.
- App-wide alert: `rooms/chat.notify.ts` emits `chat:new` to `userRoom(id)` for
  members away from the room (the apps ping and toast on it).
- Realtime: `@realtime/io` (`getIo`) — the shared Socket.IO server.
- `@utils/clusterJob` — runs the retention sweep on one replica only.
- Support only: `support/transcript`, `support/reopenWindow`,
  `support/support.pagination`, the OpenAI client and prompt service (AI first
  reply, its key read through `@config/runtimeEnv`), and the email service
  (transcript by mail).
- Staff only: `@utils/open-graph` and `@config/url-configs` (link previews),
  `@config/runtimeEnv` for the TURN relay credentials (`staffCallIce.ts`).
- Staff and support resolvers gate by role through `@middleware/rbac`.

## GraphQL operations

**rooms** — Query: `myChatRooms`, `chatParticipants`, `podMessages`,
`podChatInfo`, `myClubChatRooms`, `clubChatRoom`, `clubMessages`,
`chatPreview`, `clubChatMembers`, `chatMuteState`, `chatUnreadTotal`.
Mutation: `sendPodMessage`, `sendClubMessage` (both take `reply_to_id` and
`mentions`), `reactToPodMessage`, `deletePodMessage`, `muteChat`,
`unmuteChat` (POD / CLUB / SUPPORT), `markChatRead`.

**staff** — Query: `coworkers`, `staffThreads`, `staffMessages`,
`staffLinkPreview`, `pinnedStaffMessages`, `searchStaffMessages`,
`staffUnreadCount`, `staffPresence`, `staffCalls`, `staffChatState`,
`staffMessageEdits`, `staffCallIceServers`. Mutation: `saveStaffChatState`,
`clearStaffThread`, `attachStaffCallRecording`, `sendStaffMessage`,
`editStaffMessage`, `deleteStaffMessage`, `reactToStaffMessage`,
`forwardStaffMessage`, `pinStaffMessage`, `markStaffThreadRead`.

**support** — Query: `supportChatSessions`, `supportChatMessages`,
`mySupportChat`, `myUnifiedSupportTickets`, `supportChatTranscript`.
Mutation: `startSupportChat`, `sendSupportChatMessage`, `closeSupportChat`,
`resolveSupportChat`, `reopenSupportChat`, `submitSupportChatFeedback`,
`emailSupportChatTranscript`, `markSupportChatRead`, `claimSupportChat`,
`supportCreateUser`.

Message history is cursor-paged everywhere: `podMessages`, `clubMessages`,
`chatPreview`, `staffMessages` and `supportChatMessages` take `limit` (default
50, clamped to 1–200) and `before` (an ISO time; the page holds messages older
than it). `pinnedStaffMessages` is capped at 50 and `searchStaffMessages` at 100.

## Socket events

**rooms** — client → server: `join_pod`, `leave_pod`, `join_club`,
`leave_club`, `typing`, `club_typing`. Server → room: `message`, `reaction`,
`deleted` (also emitted by content reports when a reported message is
removed), `typing`, `club_typing`.

**staff** — client → server: `staff_typing`, `staff_status`, `call_offer`,
`call_answer`, `call_ice`, `call_decline`, `call_end`, `call_record`,
`call_resume`. Server → client: `staff_message`, `staff_message_changed`,
`staff_presence`, `staff_typing`, the relayed `call_*` events and
`call_error`.

**support** — client → server: `join_support_session`,
`leave_support_session`, `support_typing`. Server → client:
`support_chat:message`, `support_chat:session_new`,
`support_chat:session_update`, `support_typing`. Agents share the
`support:agents` room; each member has `support:user:<id>` and each chat
`support:session:<id>`.

## Splitting it out later

This folder is the unit to lift into its own service. What that would take,
in order: give it its own Socket.IO server (or a Redis adapter shared with the
main one), replace the direct model imports listed above with API calls or
read replicas, and federate its typeDefs instead of splicing them into the
main schema. Until then, keep new chat code inside this folder and keep the
barrel the only thing the server entry points import.
