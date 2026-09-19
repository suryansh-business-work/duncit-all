import type { EmailTemplate } from '@/api/emailTemplates.gql';

export const emailTemplate = (overrides: Partial<EmailTemplate>): EmailTemplate => ({
  template_id: 'tpl',
  slug: 'template',
  name: 'Template',
  description: null,
  subject: 'Subject',
  target: 'VENUE',
  mjml: '<mjml><mj-body><mj-text>Body</mj-text></mj-body></mjml>',
  variables: [],
  images: [],
  attachments: [],
  is_active: true,
  updated_at: null,
  ...overrides,
});

export const RATE_CARD = { url: 'https://cdn.duncit.com/rate-card.pdf', name: 'Rate card' };

/** Venue welcome: binds a lead value, a declared sample, the name/email heuristics and one unknown slug. */
export const venueWelcome = emailTemplate({
  template_id: 'tpl-venue',
  slug: 'venue-welcome',
  name: 'Venue welcome',
  subject: 'Hi {{ venue_name }} from {{ city }}',
  mjml: '<mjml><mj-body><mj-text>{{ venue_name }} {{ contact_email }} {{ owner_name }} {{ discount }}</mj-text></mj-body></mjml>',
  variables: [{ key: 'discount', description: 'Festive discount', sample: '10%' }],
  attachments: [RATE_CARD],
});

export const festiveGreeting = emailTemplate({
  template_id: 'tpl-static',
  slug: 'festive-greeting',
  name: 'Festive greeting',
  subject: 'Season greetings',
  target: 'STATIC',
  mjml: '<mjml><mj-body><mj-text>Happy Diwali</mj-text></mj-body></mjml>',
});

export const hostIntro = emailTemplate({ template_id: 'tpl-host', name: 'Host intro', target: 'HOST' });
export const retiredOffer = emailTemplate({ template_id: 'tpl-old', name: 'Old venue offer', is_active: false });
