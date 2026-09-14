/**
 * The API operations the suite sends itself, through `cy.gql` — never through
 * the app, so none of them shares a name with an operation a spec waits on.
 *
 * The lookups find the one record the mWeb suite filed by the run's marker, so
 * a spec knows the id DuncitTable names its row by (`<tableId>-row-<id>`)
 * before it looks for that row on screen.
 */

/** The password login every console posts; `portal_key` names the console. */
export const LOGIN_MUTATION = `mutation E2ePortalLogin($input: LoginInput!) {
  login(input: $input) { token }
}`;

/** Support › Reported Problems, searched by what happened. */
export const REPORTED_PROBLEMS_LOOKUP = `query E2eReportedProblems($query: TableQueryInput) {
  reportedProblemsTable(query: $query) { rows { id report_no message status } }
}`;

/** Support › Tickets, searched by subject. */
export const TICKETS_LOOKUP = `query E2eTickets($search: String) {
  tickets(search: $search, page: 1, page_size: 10) { items { id ticket_no subject status } }
}`;

/** Support › Callback Requests, searched by reason. */
export const CALLBACKS_LOOKUP = `query E2eCallbackRequests($search: String) {
  bouncerCallbackRequests(search: $search, page: 1, page_size: 10) {
    items { id ticket_no reason status user { name } }
  }
}`;

/** Support › SOS Alerts, searched by message. */
export const SOS_LOOKUP = `query E2eSosAlerts($search: String) {
  bouncerSosAlerts(search: $search, page: 1, page_size: 10) {
    items { id ticket_no message status user { name } pod { title } }
  }
}`;

/**
 * The run account's own Chat with Us session. Asked as the member rather than
 * searched as an agent: the inbox searches the last message's preview, which an
 * AI reply or the claim's "Picked up by" notice overwrites.
 */
export const MY_SUPPORT_CHAT = `query E2eMySupportChat {
  mySupportChat { id status agent_id user { id name } }
}`;

/** The first page of the inbox, as the Chat with Us page asks for it. */
export const CHAT_INBOX_PAGE = `query E2eChatInbox($status: SupportChatStatus, $page_size: Int) {
  supportChatSessions(status: $status, page: 1, page_size: $page_size) { items { id } }
}`;

/** A session's thread. */
export const CHAT_MESSAGES = `query E2eChatMessages($session_id: ID!) {
  supportChatMessages(session_id: $session_id, limit: 100) { id sender_role text }
}`;

/** Legal › Grievance Tickets, searched by subject. */
export const GRIEVANCES_LOOKUP = `query E2eGrievances($query: TableQueryInput) {
  grievanceTicketsTable(query: $query) { rows { id grievance_no subject description status } }
}`;

/** Every category, by level — a new pod idea needs a full Super › Category › Sub path. */
export const IDEA_CATEGORIES = `query E2eIdeaCategories {
  supers: categories(filter: { level: SUPER }) { id name parent_id }
  categories: categories(filter: { level: CATEGORY }) { id name parent_id }
  subs: categories(filter: { level: SUB }) { id name parent_id }
}`;

/** File a pod idea as the signed-in account. */
export const CREATE_POD_IDEA = `mutation E2eCreatePodIdea($input: CreatePodIdeaInput!) {
  createPodIdea(input: $input) { id title status }
}`;

/** Pod ideas, searched by title. */
export const POD_IDEAS_LOOKUP = `query E2ePodIdeas($query: TableQueryInput) {
  podIdeasTable(query: $query) { rows { id title status } }
}`;

/** Remove a pod idea (the author, or a pods moderator). */
export const DELETE_POD_IDEA = `mutation E2eDeletePodIdea($id: ID!) {
  deletePodIdea(pod_idea_doc_id: $id)
}`;
