/**
 * The emails Lite sends, seeded on first boot and edited from the console.
 * A template is plain text with {placeholders}; the server wraps it in the
 * email chrome at send time. `vars` documents what each one may use.
 */
export interface DefaultTemplate {
  key: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  vars: string[];
}

const EVENT_VARS = ['name', 'event_title', 'event_when', 'event_where', 'event_url', 'host_name', 'site_name'];

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    key: 'sign_in_code',
    name: 'Sign-in code',
    description: 'The one-time code that signs someone in.',
    subject: 'Your {site_name} sign-in code: {code}',
    body: 'Hi,\n\nYour sign-in code is {code}. It works for {minutes} minutes.\n\nIf you did not ask for it, you can ignore this email.',
    vars: ['code', 'minutes', 'site_name'],
  },
  {
    key: 'registration_confirmed',
    name: 'Registration confirmed',
    description: 'A guest is in: free ticket, approved, or payment confirmed.',
    subject: "You're in: {event_title}",
    body: 'Hi {name},\n\nYour spot at {event_title} is confirmed.\n\nWhen: {event_when}\nWhere: {event_where}\n\nYour check-in code is {code}. Open your ticket here: {ticket_url}\n\nSee you there,\n{host_name}',
    vars: [...EVENT_VARS, 'code', 'ticket_url'],
  },
  {
    key: 'registration_pending',
    name: 'Registration pending approval',
    description: 'The host approves guests by hand and has not yet.',
    subject: 'Request received: {event_title}',
    body: 'Hi {name},\n\nThanks for requesting a spot at {event_title}. The host reviews every request; we will email you as soon as they decide.\n\nWhen: {event_when}\nWhere: {event_where}\n\nTrack it here: {ticket_url}',
    vars: [...EVENT_VARS, 'ticket_url'],
  },
  {
    key: 'registration_payment_pending',
    name: 'Payment pending',
    description: 'A paid ticket was taken; the host has not yet confirmed the UPI payment.',
    subject: 'Complete your payment: {event_title}',
    body: 'Hi {name},\n\nYour spot at {event_title} is held while the host confirms your payment of ₹{amount}.\n\nPay {upi_name} on UPI at {upi_id} and add the transaction reference on your ticket page: {ticket_url}\n\nWhen: {event_when}\nWhere: {event_where}',
    vars: [...EVENT_VARS, 'amount', 'upi_id', 'upi_name', 'ticket_url'],
  },
  {
    key: 'registration_waitlisted',
    name: 'Waitlisted',
    description: 'The event is full; the guest is on the waitlist.',
    subject: "You're on the waitlist: {event_title}",
    body: 'Hi {name},\n\n{event_title} is full right now, so you are on the waitlist at position {position}. If a spot opens we will email you.\n\nWhen: {event_when}\n\nTrack it here: {ticket_url}',
    vars: [...EVENT_VARS, 'position', 'ticket_url'],
  },
  {
    key: 'registration_declined',
    name: 'Registration declined',
    description: 'The host declined a request, or rejected a payment reference.',
    subject: 'Update on {event_title}',
    body: 'Hi {name},\n\nThe host was not able to confirm your spot at {event_title}.\n\n{reason}\n\nYou can write to the host from the event page: {event_url}',
    vars: [...EVENT_VARS, 'reason'],
  },
  {
    key: 'event_reminder',
    name: 'Event reminder',
    description: 'Sent to confirmed guests before the event starts (hours set in Settings).',
    subject: 'Reminder: {event_title} is {in_words}',
    body: 'Hi {name},\n\n{event_title} is {in_words}.\n\nWhen: {event_when}\nWhere: {event_where}\n{virtual_line}\nYour check-in code is {code}. Ticket: {ticket_url}',
    vars: [...EVENT_VARS, 'in_words', 'virtual_line', 'code', 'ticket_url'],
  },
  {
    key: 'event_update',
    name: 'Host update',
    description: 'A message the host writes to every confirmed guest.',
    subject: '{event_title}: {subject}',
    body: 'Hi {name},\n\n{message}\n\n— {host_name}\n\nEvent page: {event_url}',
    vars: [...EVENT_VARS, 'subject', 'message'],
  },
  {
    key: 'event_cancelled',
    name: 'Event cancelled',
    description: 'Sent to every registered guest when the host cancels.',
    subject: 'Cancelled: {event_title}',
    body: 'Hi {name},\n\n{event_title} on {event_when} has been cancelled.\n\n{reason}\n\nIf you paid the host on UPI, please contact them for a refund: {host_email}',
    vars: [...EVENT_VARS, 'reason', 'host_email'],
  },
  {
    key: 'host_new_registration',
    name: 'Host: new registration',
    description: 'Tells the host someone registered, requested, or paid.',
    subject: '{guest_name} registered for {event_title}',
    body: 'Hi {name},\n\n{guest_name} ({guest_email}) {what} for {event_title}.\n\nManage guests: {manage_url}',
    vars: [...EVENT_VARS, 'guest_name', 'guest_email', 'what', 'manage_url'],
  },
  {
    key: 'calendar_new_event',
    name: 'Calendar: new event',
    description: 'Sent to a calendar’s subscribers when it publishes an event.',
    subject: 'New from {calendar_name}: {event_title}',
    body: 'Hi {name},\n\n{calendar_name} just published {event_title}.\n\nWhen: {event_when}\nWhere: {event_where}\n\nSee the event: {event_url}',
    vars: [...EVENT_VARS, 'calendar_name'],
  },
  {
    key: 'cohost_added',
    name: 'Co-host added',
    description: 'Someone was made a co-host of an event.',
    subject: 'You are now a co-host of {event_title}',
    body: 'Hi {name},\n\n{host_name} added you as a co-host of {event_title}. You can edit the event and manage its guests here: {manage_url}',
    vars: [...EVENT_VARS, 'manage_url'],
  },
];
