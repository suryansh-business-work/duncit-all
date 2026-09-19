import type { MockedResponse } from '@apollo/client/testing';
import EmailTemplateEditorPage from '@/pages/email-templates/EditorPage';
import { EMAIL_TEMPLATE, RENDER, type EmailTemplate } from '@/api/emailTemplates.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { emailTemplate } from '../compose/fixtures';

export const TEMPLATE_ID = 'tpl-venue';

export const venueTemplate: EmailTemplate = emailTemplate({
  template_id: TEMPLATE_ID,
  slug: 'venue-welcome',
  name: 'Venue welcome',
  subject: 'Hi {{ venue_name }}',
  target: 'VENUE',
  mjml: '<mjml><mj-body><mj-section><mj-column><mj-text>Hi {{ venue_name }}</mj-text></mj-column></mj-section></mj-body></mjml>',
  variables: [{ key: 'venue_name', description: 'Venue display name', sample: 'Grand Hall' }],
  images: [{ url: 'https://cdn.duncit.com/hero.png', name: 'Hero' }],
  attachments: [{ url: 'https://cdn.duncit.com/rate-card.pdf', name: 'Rate card' }],
  updated_at: '2026-09-01T10:00:00.000Z',
});

export const templateMock = (template: EmailTemplate | null, uses = 10): MockedResponse => ({
  request: { query: EMAIL_TEMPLATE, variables: { id: TEMPLATE_ID } },
  result: { data: { emailTemplate: template } },
  maxUsageCount: uses,
});

export interface RenderAnswer {
  html?: string;
  errors?: string[];
  detected?: string[];
}

/** Answers every preview render (any MJML) the same way. */
export const renderMock = (answer: RenderAnswer | Error): MockedResponse => ({
  request: { query: RENDER, variables: () => true },
  ...(answer instanceof Error
    ? { error: answer }
    : {
        result: {
          data: {
            renderEmailTemplate: {
              html: answer.html ?? '<p>Hi Grand Hall</p>',
              errors: answer.errors ?? [],
              detected_variables: answer.detected ?? [],
            },
          },
        },
      }),
  maxUsageCount: 20,
});

/** The preview renders on a 600 ms debounce. */
export const PREVIEW_WAIT = { timeout: 3000 };

export const renderEditor = (mocks: MockedResponse[]) =>
  renderWithApollo(<EmailTemplateEditorPage />, mocks, { route: `/email-templates/${TEMPLATE_ID}`, path: '/email-templates/:id' });
