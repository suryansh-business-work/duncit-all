import { Types } from 'mongoose';
import { chatResolvers } from '../../chat.resolver';
import { chatMuteService } from '../../chat.mute';
import { chatUnreadService } from '../../chat.unread';
import { PodMessageModel } from '../../chat.model';
import { ChatMuteModel, claimChatNotify } from '../../chatState.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { ClubFollowerModel } from '@modules/access/user/relations/clubFollower.model';
import { UserBlockModel } from '@modules/access/block/userBlock.model';
import { makeContext } from '@test/harness';

let seq = 0;
const Q = chatResolvers.Query as Record<string, (...args: unknown[]) => Promise<any>>;
const M = chatResolvers.Mutation as Record<string, (...args: unknown[]) => Promise<any>>;
const ctx = (id: unknown) => makeContext({ id: String(id) });

async function seedUser(first: string) {
  return UserModel.create({
    auth: { email: `state${++seq}@x.com` },
    profile: { first_name: first, last_name: 'Doe' },
  });
}

/** A club room with an admin and two followers — a club room never closes. */
async function seedClubRoom() {
  const admin = await seedUser('Asha');
  const ravi = await seedUser('Ravi');
  const meera = await seedUser('Meera');
  const club = await ClubModel.create({
    club_id: `club-${++seq}`,
    club_name: 'Runners',
    super_category_id: new Types.ObjectId(),
    admin_user_ids: [admin._id],
  });
  await ClubFollowerModel.create([
    { club_id: club._id, user_id: ravi._id },
    { club_id: club._id, user_id: meera._id },
  ]);
  return { club, admin, ravi, meera, clubId: String(club._id) };
}

const send = (clubId: string, uid: unknown, extra: Record<string, unknown> = {}) =>
  M.sendClubMessage({}, { club_id: clubId, text: 'hello', ...extra }, ctx(uid));

describe('chat replies', () => {
  it('embeds the quoted line of a reply in the same room', async () => {
    const { clubId, admin, ravi } = await seedClubRoom();
    const original = await send(clubId, admin._id, { text: 'Meet at 7?' });
    const reply = await send(clubId, ravi._id, { text: 'Yes', reply_to_id: original.id });
    expect(reply.reply_to_id).toBe(original.id);
    expect(reply.reply_to).toMatchObject({
      id: original.id,
      user_id: String(admin._id),
      user_name: 'Asha Doe',
      text: 'Meet at 7?',
      deleted: false,
    });
  });

  it('refuses a reply to a message from another room', async () => {
    const a = await seedClubRoom();
    const b = await seedClubRoom();
    const elsewhere = await send(b.clubId, b.admin._id, { text: 'secret' });
    await expect(send(a.clubId, a.admin._id, { reply_to_id: elsewhere.id })).rejects.toThrow(
      'not in this chat'
    );
  });

  it('refuses a reply to a removed message or a malformed id', async () => {
    const { clubId, admin } = await seedClubRoom();
    const original = await send(clubId, admin._id);
    await PodMessageModel.updateOne({ _id: original.id }, { deleted: true });
    await expect(send(clubId, admin._id, { reply_to_id: original.id })).rejects.toThrow('not in this chat');
    await expect(send(clubId, admin._id, { reply_to_id: 'nope' })).rejects.toThrow('not in this chat');
  });

  it('reads a quote as deleted once its original is removed, across a history page', async () => {
    const { clubId, admin, ravi } = await seedClubRoom();
    const original = await send(clubId, admin._id, { text: 'old plan' });
    await send(clubId, ravi._id, { text: 'ok', reply_to_id: original.id });
    await PodMessageModel.updateOne({ _id: original.id }, { deleted: true, text: '' });
    const page = await Q.clubMessages({}, { club_id: clubId }, ctx(ravi._id));
    const reply = page.find((m: { text: string }) => m.text === 'ok');
    expect(reply.reply_to).toMatchObject({ id: original.id, deleted: true, text: '' });
  });

  it('hides the quoted words of someone the reader has blocked', async () => {
    const { clubId, admin, ravi, meera } = await seedClubRoom();
    const original = await send(clubId, admin._id, { text: 'from Asha' });
    await send(clubId, ravi._id, { text: 'replying', reply_to_id: original.id });
    await UserBlockModel.create({ blocker_id: meera._id, blocked_id: admin._id, blocked_at: new Date() });
    const page = await Q.clubMessages({}, { club_id: clubId }, ctx(meera._id));
    const reply = page.find((m: { text: string }) => m.text === 'replying');
    expect(reply.reply_to).toMatchObject({ deleted: true, text: '' });
  });
});

describe('chat mentions', () => {
  it('stores member mentions and names them for the bubble', async () => {
    const { clubId, admin, ravi } = await seedClubRoom();
    const msg = await send(clubId, admin._id, { text: 'hi @Ravi', mentions: [String(ravi._id)] });
    expect(msg.mentions).toEqual([String(ravi._id)]);
    expect(msg.mention_users).toEqual([
      { user_id: String(ravi._id), full_name: 'Ravi Doe', profile_photo: null },
    ]);
  });

  it('refuses a mention of someone outside the room', async () => {
    const { clubId, admin } = await seedClubRoom();
    const outsider = await seedUser('Out');
    await expect(
      send(clubId, admin._id, { text: '@Out', mentions: [String(outsider._id)] })
    ).rejects.toThrow('not in this chat');
  });

  it('drops a self-mention and duplicates instead of storing them', async () => {
    const { clubId, admin, ravi } = await seedClubRoom();
    const msg = await send(clubId, admin._id, {
      mentions: [String(admin._id), String(ravi._id), String(ravi._id)],
    });
    expect(msg.mentions).toEqual([String(ravi._id)]);
  });

  it('lists club members for the @ list by name prefix, members only', async () => {
    const { clubId, ravi } = await seedClubRoom();
    const found = await Q.clubChatMembers({}, { club_id: clubId, search: 'me' }, ctx(ravi._id));
    expect(found.map((u: { full_name: string }) => u.full_name)).toEqual(['Meera Doe']);
    const outsider = await seedUser('Out');
    await expect(Q.clubChatMembers({}, { club_id: clubId }, ctx(outsider._id))).rejects.toThrow();
  });
});

describe('chat mute', () => {
  it('mutes for a set time or always, and unmutes', async () => {
    const { clubId, ravi } = await seedClubRoom();
    const timed = await M.muteChat({}, { kind: 'CLUB', id: clubId, duration: 'EIGHT_HOURS' }, ctx(ravi._id));
    expect(timed.is_muted).toBe(true);
    const hours = (Date.parse(timed.muted_until) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThanOrEqual(8);

    const always = await M.muteChat({}, { kind: 'CLUB', id: clubId, duration: 'ALWAYS' }, ctx(ravi._id));
    expect(always).toMatchObject({ is_muted: true, muted_until: null });
    // Muting twice moves the one row rather than adding a second.
    expect(await ChatMuteModel.countDocuments({ user_id: String(ravi._id), room_id: clubId })).toBe(1);

    const room = await Q.clubChatRoom({}, { club_id: clubId }, ctx(ravi._id));
    expect(room.is_muted).toBe(true);

    const off = await M.unmuteChat({}, { kind: 'CLUB', id: clubId }, ctx(ravi._id));
    expect(off).toMatchObject({ is_muted: false, muted_until: null });
  });

  it('refuses a mute from someone outside the room, or of an unknown kind', async () => {
    const { clubId } = await seedClubRoom();
    const outsider = await seedUser('Out');
    await expect(
      M.muteChat({}, { kind: 'CLUB', id: clubId, duration: 'ALWAYS' }, ctx(outsider._id))
    ).rejects.toThrow();
    await expect(
      M.muteChat({}, { kind: 'DM', id: clubId, duration: 'ALWAYS' }, ctx(outsider._id))
    ).rejects.toThrow('Unknown chat kind');
  });

  it('counts only mutes still in force', async () => {
    const roomId = new Types.ObjectId().toString();
    await ChatMuteModel.create([
      { user_id: 'a', room_kind: 'CLUB', room_id: roomId, muted_until: null },
      { user_id: 'b', room_kind: 'CLUB', room_id: roomId, muted_until: new Date(Date.now() + 60_000) },
      { user_id: 'c', room_kind: 'CLUB', room_id: roomId, muted_until: new Date(Date.now() - 60_000) },
    ]);
    expect([...(await chatMuteService.mutedUserIds('CLUB', roomId))].sort()).toEqual(['a', 'b']);
  });
});

describe('chat unread', () => {
  it('counts lines since the last read, never the reader’s own', async () => {
    const { clubId, admin, ravi } = await seedClubRoom();
    // Read a second ago, so the lines below are strictly newer than the mark.
    await chatUnreadService.markRead(String(ravi._id), { kind: 'CLUB', id: clubId }, Date.now() - 1000);
    await send(clubId, admin._id);
    await send(clubId, admin._id);
    await send(clubId, ravi._id);
    const rows = await Q.myClubChatRooms({}, {}, ctx(ravi._id));
    expect(rows.find((r: { id: string }) => r.id === clubId).unread_count).toBe(2);

    await M.markChatRead({}, { kind: 'CLUB', id: clubId }, ctx(ravi._id));
    const after = await Q.myClubChatRooms({}, {}, ctx(ravi._id));
    expect(after.find((r: { id: string }) => r.id === clubId).unread_count).toBe(0);
  });

  it('never winds a read mark back', async () => {
    const { clubId, admin, ravi } = await seedClubRoom();
    await send(clubId, admin._id);
    await chatUnreadService.markRead(String(ravi._id), { kind: 'CLUB', id: clubId }, Date.now() + 60_000);
    await chatUnreadService.markRead(String(ravi._id), { kind: 'CLUB', id: clubId }, Date.now() - 60_000);
    expect(await Q.chatUnreadTotal({}, {}, ctx(ravi._id))).toBe(0);
  });

  it('leaves muted rooms out of the total', async () => {
    const a = await seedClubRoom();
    await send(a.clubId, a.admin._id);
    expect(await Q.chatUnreadTotal({}, {}, ctx(a.ravi._id))).toBe(1);
    await M.muteChat({}, { kind: 'CLUB', id: a.clubId, duration: 'ALWAYS' }, ctx(a.ravi._id));
    expect(await Q.chatUnreadTotal({}, {}, ctx(a.ravi._id))).toBe(0);
  });

  it('counts a pod room and refuses read marks for support or outsiders', async () => {
    const host = await seedUser('Host');
    const guest = await seedUser('Guest');
    const pod = await PodModel.create({
      pod_id: `pod-${++seq}`,
      pod_title: 'Evening run',
      pod_hosts_id: [host._id],
      pod_attendees: [guest._id],
      club_id: new Types.ObjectId(),
      pod_description: 'desc',
      pod_date_time: new Date(Date.now() + 86_400_000),
      pod_end_date_time: new Date(Date.now() + 90_000_000),
      pod_type: 'PAID',
      is_active: true,
    });
    await M.sendPodMessage({}, { pod_id: String(pod._id), text: 'see you' }, ctx(host._id));
    const rooms = await Q.myChatRooms({}, {}, ctx(guest._id));
    expect(rooms[0]).toMatchObject({ unread_count: 1, is_muted: false });
    await expect(
      M.markChatRead({}, { kind: 'SUPPORT', id: String(pod._id) }, ctx(guest._id))
    ).rejects.toThrow('own read state');
    const outsider = await seedUser('Out');
    await expect(
      M.markChatRead({}, { kind: 'POD', id: String(pod._id) }, ctx(outsider._id))
    ).rejects.toThrow();
  });
});

describe('claimChatNotify', () => {
  it('lets one caller notify about a message, never a second', async () => {
    const key = `chat:${new Types.ObjectId()}`;
    expect(await claimChatNotify(key)).toBe(true);
    expect(await claimChatNotify(key)).toBe(false);
  });
});
