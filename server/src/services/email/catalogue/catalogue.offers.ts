/**
 * The booking-offer emails: one side has put terms on the table and the other
 * has to answer before they run out. Each carries the WHOLE offer — the window,
 * the guests, the price model and what the venue receives (or what the pod
 * pays), the points asked of the venue, the note — so the reader can decide
 * from the email alone, and a button into the venue chat where they answer.
 *
 * Both mirror a WhatsApp scenario (`waEvent`): the first twelve `vars` are its
 * params, in order, and the rest are email-only. Host-written text arrives
 * escaped from the sender (`offerings_html`, `request_note`) — `applyVars`
 * writes values into the HTML as they are.
 */
import { closing, cta, detailRows, htmlBlock, introBlock, paragraph, quote, shell } from './mjml';
import { FIELD, FOOTER } from './catalogue.copy';
import { v, type EmailDef } from './catalogue.types';

/** One body for both: who moved and what they ask, then the terms, the points, the note and the way to answer. */
function offerBody(copyKey: string, partyVar: string, moneyKey: string, moneyVar: string, contactRows: boolean): string {
  const rows = [
    { labelKey: FIELD.pod, valueVar: 'pod' },
    { labelKey: FIELD.date, valueVar: 'date' },
    { labelKey: FIELD.time, valueVar: 'time' },
    { labelKey: 'email.venueOffer.terms', valueVar: 'terms' },
    { labelKey: 'email.venueOffer.guests', valueVar: 'guests' },
    { labelKey: moneyKey, valueVar: moneyVar },
    { labelKey: 'email.venueOffer.replyBy', valueVar: 'reply_by' },
  ];
  if (contactRows) {
    rows.push({ labelKey: 'email.venueOffer.phone', valueVar: 'contact_phone' }, { labelKey: 'email.venueOffer.email', valueVar: 'contact_email' });
  }
  return shell(
    `${copyKey}.title`,
    [
      introBlock({
        title: `{{t:${copyKey}.title}}`,
        nameVar: 'name',
        body: `<strong>{{${partyVar}}}</strong> {{t:${copyKey}.body}}`,
      }),
      detailRows(rows),
      paragraph('<strong>{{t:email.venueOffer.offerings}}</strong>'),
      htmlBlock('offerings_html'),
      quote('email.venueOffer.request', 'request_note'),
      cta('email.venueOffer.cta', 'chat_url'),
      closing('email.venueOffer.help'),
    ].join('\n'),
    `${copyKey}.body`
  );
}

/** The twelve values both WhatsApp twins send, documented once. */
const sharedVars = (party: 'host' | 'venue') => [
  v('name', 'The reader’s first name.', party === 'host' ? 'Rohit' : 'Meera'),
  v('pod', 'The pod being booked.', 'Sunday Badminton Doubles'),
  v('date', 'The booking’s date, already formatted.', '24 Aug 2026'),
  v('time', 'The booking’s start and end, already formatted.', '7:00 AM – 9:00 AM'),
  v(party, party === 'host' ? 'The host who sent the offer.' : 'The venue that countered.', party === 'host' ? 'Meera Nair' : 'Sector 62 Sports Arena'),
  v('terms', 'The price terms, e.g. “₹500 per guest”.', '₹500 per guest'),
  v('guests', 'The fewest to the most guests.', '8–20 guests'),
];

export const VENUE_OFFER_EMAILS: readonly EmailDef[] = [
  {
    slug: 'venue-offer-received',
    name: 'Venue: Booking Offer Received',
    description:
      'The venue owner, when a host sends a booking offer for their venue — or counters the venue’s own terms. The whole offer is in the email; the button opens the venue chat to accept, decline or counter.',
    audience: 'VENUE',
    category: 'notification',
    fires: 'A host sends a booking offer, or counters the venue’s terms',
    waEvent: 'VENUE_OFFER_RECEIVED',
    subject: 'Booking offer for {{pod}} — reply by {{reply_by}}',
    footerNote: FOOTER.venue,
    vars: [
      ...sharedVars('host'),
      v('venue_receives', 'What the venue is paid, at the fewest to the most guests.', '₹4,720–₹11,800'),
      v('offerings', 'What the host asks the venue to provide, as one line.', 'Projector; Snacks for 20; Parking'),
      v('request', 'The host’s note, as one line (“No special request” when empty).', 'Please keep the AC on'),
      v('reply_by', 'When the venue must answer by, already formatted.', '23 Aug 2026, 7:00 PM'),
      v('chat_url', 'The venue chat for this booking, where the offer is answered.', 'https://partners.duncit.com/venues/pods/64f…/chat'),
      v('venue_name', 'The venue being booked.', 'Sector 62 Sports Arena'),
      v('offerings_html', 'The points as an HTML list (escaped by the sender).', '<ul><li>Projector</li></ul>'),
      v('request_note', 'The host’s note with its line breaks (escaped by the sender).', 'Please keep the AC on'),
      v('contact_phone', 'The host’s phone.', '+919876543210'),
      v('contact_email', 'The host’s email.', 'meera@example.com'),
    ],
    mjml: offerBody('email.venueOffer', 'host', 'email.venueOffer.receives', 'venue_receives', true),
  },
  {
    slug: 'host-venue-counter-offer',
    name: 'Host: Venue Sent a Counter Offer',
    description:
      'Every host of a pod, when the venue answers their booking offer with terms of its own. The whole counter is in the email; the button opens the venue chat to accept, decline or counter back.',
    audience: 'HOST',
    category: 'notification',
    fires: 'A venue counters a host’s booking offer',
    waEvent: 'HOST_VENUE_COUNTER_OFFER',
    subject: '{{venue}} sent a counter offer for {{pod}}',
    footerNote: FOOTER.host,
    vars: [
      ...sharedVars('venue'),
      v('pod_pays', 'What the booking costs the pod (with Duncit’s commission), at the fewest to the most guests.', '₹5,192–₹12,980'),
      v('offerings', 'What the venue will provide, as one line.', 'Projector; Snacks for 20'),
      v('request', 'The venue’s note, as one line.', 'Snacks are veg only'),
      v('reply_by', 'When the host must answer by, already formatted.', '23 Aug 2026, 7:00 PM'),
      v('chat_url', 'The venue chat for this pod.', 'https://duncit.com/venue-chat/64f…'),
      v('offerings_html', 'The points as an HTML list (escaped by the sender).', '<ul><li>Projector</li></ul>'),
      v('request_note', 'The venue’s note with its line breaks (escaped by the sender).', 'Snacks are veg only'),
      v('contact_phone', 'The venue’s phone.', '+919812345678'),
      v('contact_email', 'The venue’s email.', 'arena@example.com'),
    ],
    mjml: offerBody('email.hostVenueCounter', 'venue', 'email.venueOffer.podPays', 'pod_pays', true),
  },
];

/** Their English copy (rule 38) — spread into EMAIL_FALLBACK with the rest of the catalogue's. */
export const VENUE_OFFER_EMAIL_FALLBACK: Record<string, string> = {
  'email.venueOffer.title': 'New booking offer',
  'email.venueOffer.body': 'sent you a booking offer. Accept it, decline it or counter with your own terms before it expires.',
  'email.hostVenueCounter.title': 'The venue sent a counter offer',
  'email.hostVenueCounter.body': 'answered your booking offer with terms of its own. Accept them, decline them or counter back before they expire.',
  'email.venueOffer.terms': 'Offer',
  'email.venueOffer.guests': 'Guests',
  'email.venueOffer.receives': 'You receive',
  'email.venueOffer.podPays': 'The booking costs the pod',
  'email.venueOffer.replyBy': 'Reply by',
  'email.venueOffer.phone': 'Phone',
  'email.venueOffer.email': 'Email',
  'email.venueOffer.offerings': 'Needed from the venue',
  'email.venueOffer.request': 'Request',
  'email.venueOffer.noRequest': 'No special request',
  'email.venueOffer.cta': 'Answer in the chat',
  'email.venueOffer.help': 'Unanswered offers expire at the time above. Per-guest money is settled on the people who come, never fewer than the minimum.',
  'email.venueOffer.model.PER_GUEST': 'per guest',
  'email.venueOffer.model.PER_HOUR': 'per hour',
  'email.venueOffer.model.FLAT': 'flat',
  'email.venueOffer.model.FREE': 'Free venue (no charge) — accept or decline it; free bookings cannot be countered',
  'email.venueOffer.guestRange': 'guests',
};
