import type { NestedCatalogue } from '../catalogue';

/**
 * The Support console's own copy — SOS alerts, callback requests, tickets,
 * live chat and the reported-problem queue.
 *
 * Generic labels (Name, Email, Phone, Status, Actions, Created, Title, Close,
 * Cancel) come from `shell.common.*`; the agent's first/last name fields from
 * `shell.profile.*` (rule 40).
 *
 * What a user wrote — a ticket subject, a problem description, a chat message —
 * is never keyed. Support reads back exactly what was sent.
 */
export const SUPPORT_BUNDLE: NestedCatalogue = {
  support: {
    dashboard: {
      title: 'Support Dashboard',
      subtitle: 'Live overview of safety alerts, callbacks, tickets and chats awaiting your team.',
      activeSos: 'Active SOS alerts',
      pendingCallbacks: 'Pending callbacks',
      openTickets: 'Open tickets',
      openChats: 'Open chats',
    },

    sos: {
      title: 'SOS Alerts',
      subtitle: 'Live safety alerts raised by users. Open one to acknowledge or resolve it.',
      detailTitle: 'SOS Alert',
      empty: 'No SOS Alerts Found',
      colId: 'ID',
      colUser: 'User',
      colPod: 'Pod',
      colRaised: 'Raised',
      statusActive: 'Active',
      statusAcknowledged: 'Acknowledged',
      statusResolved: 'Resolved',
    },

    callbacks: {
      title: 'Callback Requests',
      subtitle: 'Users who asked for a call back. Open one to mark it contacted or close it.',
      detailTitle: 'Callback Request',
      empty: 'No Callback Requests Found',
      colId: 'ID',
      colUser: 'User',
      colPod: 'Pod',
      colRequested: 'Requested',
      statusPending: 'Pending',
      statusContacted: 'Contacted',
      statusResolved: 'Resolved',
      duration: 'Call duration (min)',
      conclusion: 'Conclusion',
    },

    tickets: {
      title: 'Tickets',
      subtitle: 'Support tickets from users. Open one to reply, or raise a new ticket.',
      detailTitle: 'Ticket',
      empty: 'No tickets here yet.',
      colId: 'Ticket ID',
      colSubject: 'Subject',
      colUser: 'User',
      colCategory: 'Category',
      colSource: 'Source',
      colPriority: 'Priority',
      colLastActivity: 'Last activity',
      // Where the ticket came from. The agent reads these; the server stores
      // an enum, so they are copy rather than the stored value.
      sourceApp: 'Duncit App',
      sourceWebsite: "Duncit's Main Website",
      sourceMailbox: 'Connected Mailbox',
      sort: 'Sort',
      priority: 'Priority',
      priorityHigh: 'High',
      priorityMedium: 'Medium',
      priorityLow: 'Low',
      subject: 'Subject',
      category: 'Category',
      create: 'New Ticket',
      verified: 'Verified',
      reopen: 'Re-open ticket',
      markResolved: 'Mark resolved',
      resolveTitle: 'Mark this ticket resolved?',
      resolveBody:
        'The ticket will be marked resolved and the user can leave feedback. You can re-open it later if needed.',
      closeTitle: 'Close this support ticket?',
      closeBody:
        'Are you sure you want to close this support ticket? It will become permanently read-only — the user can reopen it within the allowed window.',
      closeTicket: 'Close ticket',
    },

    chat: {
      attach: 'Attach',
      placeholder: 'Type a message…',
      sending: 'Sending',
      seen: 'Seen',
      delivered: 'Delivered',
      selectSession: 'Select a session to open the chat.',
      jumpToLatest: 'Jump to latest',
      filterOpen: 'Open',
      filterResolved: 'Resolved',
      search: 'Search',
      resolveTitle: 'Mark this chat resolved?',
      resolveBody:
        'The conversation will be closed and the user will be asked to leave feedback. You can re-open it later if needed.',
      markResolved: 'Mark resolved',
      newSession: 'NEW',
      agentTyping: 'Support is typing…',
      userTyping: '{name} is typing…',
      fallbackUser: 'User',
    },

    createUser: {
      title: 'Create user account',
      ext: 'Ext',
      phoneOptional: 'Phone (optional)',
      tempPassword: 'Temporary password',
      tempPasswordHint: 'Min 8 characters — share it with the user securely.',
    },

    transcript: {
      export: 'Export transcript',
      recipientEmail: 'Recipient email',
      downloadTxt: 'Download .txt',
      downloadDocx: 'Download .docx',
      emailPrompt: 'Email transcript…',
      email: 'Email transcript',
    },

    problems: {
      title: 'Reported Problems',
      subtitle: 'Problem reports filed from the app.',
      empty: 'No problems have been reported yet.',
      colId: 'Report ID',
      colCategory: 'Category',
      colWhatHappened: 'What happened',
      colReportedBy: 'Reported by',
      colFrom: 'From',
      colSlack: 'Slack',
      colReported: 'Reported',
      slackNotSent: 'Not sent',
      slackSent: 'Sent',
      screenshots: 'Screenshots',
      reportedScreenshot: 'Reported screenshot',
      reporter: 'Reporter',
      whereItHappened: 'Where it happened',
      city: 'City',
      language: 'Language',
      roles: 'Roles',
      userId: 'User ID',
      surface: 'Surface',
      appVersion: 'App version',
      deviceOs: 'Device / OS',
      modelScreen: 'Model / screen',
      screen: 'Screen',
      reportedAt: 'Reported at',
      unknownReporter: 'Unknown',
      noAccount: 'No account',
    },

    problemSettings: {
      title: 'Configure Report a Problem',
      subtitle: 'The categories and prompt the app shows when someone reports a problem.',
      shown: 'Shown',
      newCategory: 'New category',
      question: 'Question',
      helperText: 'Helper text',
      minCharacters: 'Minimum characters',
      allowScreenshots: 'Let reporters attach screenshots',
      maxScreenshots: 'Max screenshots',
    },
  },
};
