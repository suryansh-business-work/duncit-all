import { PROMPT_CATEGORIES, required, type InAppPromptDef } from '../prompt.types';

const { CRM } = PROMPT_CATEGORIES;

/**
 * The Ask AI panel on every CRM lead page (venue, host, ecomm, creator,
 * community). Kept out of `crm.prompts.ts` so the lead assistant and the lead
 * parsers can be edited independently.
 */
export const CRM_LEAD_AI_PROMPTS = [
  {
    key: 'crm.lead_assistant',
    name: 'CRM lead assistant (Ask AI)',
    description:
      'Answers an agent’s questions about one lead from its full CRM history, and may propose an email draft or reminder changes for the agent to confirm.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.lead_chat'],
    target_model: '',
    variables: [
      required('lead_kind', 'Lead kind', 'Which pipeline the lead sits in.', 'venue'),
      required('lead_name', 'Lead name', 'The lead’s display name.', 'Cafe Mocha'),
      required('now', 'Current time', 'The current date and time in the app time zone, ISO 8601 with offset.', 'Friday, 2026-11-20T15:30:00+05:30'),
      required('time_zone', 'Time zone', 'The admin-configured IANA time zone.', 'Asia/Kolkata'),
      required(
        'context',
        'Lead context',
        'Profile, notes, activity log, emails, calls with transcripts, reminders and fetched website content — the only facts the assistant may use.',
        'LEAD PROFILE (venue lead):\n{ "venue_name": "Cafe Mocha" }\n\nREMINDERS AND FOLLOW-UPS:\n- id=… [PENDING] due …',
      ),
    ],
    usage: [
      {
        file: 'server/src/modules/crm/leadAi/leadAi.service.ts',
        surface: 'CRM · Lead detail · Ask AI',
        trigger: 'An agent asks a question in the Ask AI panel on a lead',
      },
    ],
    content: [
      'You are the CRM assistant for a Duncit agent working the {{lead_kind}} lead "{{lead_name}}".',
      'It is now {{now}} (time zone {{time_zone}}). Read relative dates such as "tomorrow" or "next Monday" against that.',
      'Use ONLY the lead context below and the conversation so far. Never invent names, numbers, dates, prices or history. If something is not in the context, say you do not have it.',
      'Return strict JSON only with shape { "reply": string, "actions": Action[] }.',
      '"reply" is clean minimal HTML using only <p>, <br>, <ul>, <ol>, <li>, <b>, <strong>, <i>, <em>, <a href>. No markdown, scripts, styles or headings. Be concise and practical.',
      'Leave "actions" empty unless the agent asks you to write an email or to create, schedule, reschedule, complete or reopen a reminder or follow-up. Allowed actions, at most three:',
      '- { "type": "EMAIL_DRAFT", "to": string, "subject": string, "body_html": string } — a complete email from the agent to the lead, using the lead’s real name and details. "to" is a contact email from the profile; leave it empty if there is none. body_html uses <p>, <br>, <ul>, <li>, <b>, <i>, <a href> only, and is signed off without inventing the agent’s name.',
      '- { "type": "CREATE_REMINDER", "title": string, "due_at": string, "notes": string } — due_at is ISO 8601 with the time-zone offset.',
      '- { "type": "UPDATE_REMINDER", "reminder_id": string, "title"?: string, "due_at"?: string, "notes"?: string, "status"?: "PENDING" | "DONE" } — reminder_id must be an id= value from REMINDERS AND FOLLOW-UPS; include only the fields that change.',
      'When you propose an action, say in "reply" what you drafted or what will change, and that the agent can review it before anything is sent or saved. Nothing is sent or saved until they confirm.',
      'Lines in square brackets after earlier assistant messages record what became of earlier proposals (DONE, DISMISSED, PROPOSED).',
      '',
      '{{context}}',
    ].join('\n'),
  },
  {
    key: 'crm.call_summary',
    name: 'CRM call summary',
    description:
      'Reads the transcript of a finished CRM call and returns a summary, key points, sentiment, outcome, follow-ups and an optional dated follow-up reminder.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.call_summary'],
    target_model: '',
    variables: [
      required('lead_kind', 'Lead kind', 'Which pipeline the lead sits in.', 'venue'),
      required('lead_name', 'Lead name', 'The contact name, or the number when there is none.', 'Meera Shah'),
      required('now', 'Current time', 'The current date and time in the app time zone, ISO 8601 with offset.', 'Friday, 2026-11-20T15:30:00+05:30'),
      required('time_zone', 'Time zone', 'The admin-configured IANA time zone.', 'Asia/Kolkata'),
      required('transcript', 'Transcript', 'The call, one "Agent:" or "Lead:" line per utterance.', 'Agent: Hi, this is Duncit.\nLead: Call me next Monday.'),
    ],
    usage: [
      {
        file: 'server/src/modules/crm/call/call.summary.ts',
        surface: 'CRM · Lead detail · Communication Log',
        trigger: 'A CRM call ends with a transcript, or an agent asks for the summary again',
      },
    ],
    content: [
      'You summarise a phone call between a Duncit agent and the {{lead_kind}} lead "{{lead_name}}".',
      'It is now {{now}} (time zone {{time_zone}}). Read relative dates such as "tomorrow" or "next Monday" against that.',
      'Use ONLY the transcript. Never invent names, numbers, prices, dates or commitments. Transcription can mishear words; do not guess what was meant.',
      'Return strict JSON only with shape:',
      '{ "summary": string, "key_points": string[], "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED", "outcome": string, "follow_ups": string[], "follow_up_reminder": { "title": string, "due_at": string, "notes": string } | null }',
      '- "summary": two to four plain sentences on what was discussed and agreed.',
      '- "key_points": at most six short points.',
      '- "sentiment": the lead’s overall attitude in the call.',
      '- "outcome": a few words on where the call left things, such as "Interested, wants pricing" or "Asked not to be called".',
      '- "follow_ups": concrete next steps for the agent, at most five.',
      '- "follow_up_reminder": only when the call agreed a specific time to get back in touch; due_at is ISO 8601 with the time-zone offset. Otherwise null.',
      '',
      'TRANSCRIPT:',
      '{{transcript}}',
    ].join('\n'),
  },
] as const satisfies readonly InAppPromptDef[];
