/**
 * What a WhatsApp log row shows when it is opened: the message that went out.
 *
 * Nothing stores the rendered text — a send posts a campaign name and a list of
 * values, and AiSensy assembles the words — so the message is put back together
 * from the template AiSensy holds for that campaign now plus the values the
 * send froze. Two things have to hold for that to be worth trusting:
 *
 *  - the values must be listed as DATA as well as drawn into the sentence. A
 *    value that went out blank is invisible in the bubble (the preview falls
 *    back to its placeholder), and a blank value is the bug somebody opens the
 *    row to find.
 *  - a catalogue that cannot be read must say so rather than draw a message
 *    nobody sent — the values are still the record, and they still show.
 */
import { describe, expect, it } from 'vitest';

import { flush, renderWithProviders } from '../testkit';
import SentMessage from '../../src/pages/whatsapp-campaigns-page/wa-message';
import RecipientMessageDialog from '../../src/pages/whatsapp-campaigns-page/wa-campaign-detail/RecipientMessageDialog';
import SentVariables from '../../src/pages/whatsapp-campaigns-page/wa-message/SentVariables';
import { AISENSY_CATALOGUE } from '../../src/pages/whatsapp-campaigns-page/queries';

const BODY = 'Hi {{1}}, your pod at {{2}} starts in an hour.';

const template = {
  __typename: 'AisensyTemplate',
  id: 'tpl-1',
  name: 'pod_reminder',
  status: 'APPROVED',
  category: 'UTILITY',
  language: 'English',
  body: BODY,
  param_count: 2,
  header: 'Duncit',
  header_format: 'TEXT',
  needs_media: false,
  footer: 'Reply STOP to opt out',
  buttons: [],
  cta_buttons: [],
};

const campaign = {
  __typename: 'AisensyCampaign',
  name: 'pod_reminder_live',
  status: 'LIVE',
  template_name: 'pod_reminder',
  type: 'ONE_TIME',
  media_url: '',
  media_filename: '',
};

const catalogue = (over: { campaigns?: unknown[]; templates?: unknown[] } = {}) => ({
  request: { query: AISENSY_CATALOGUE },
  result: {
    data: {
      aisensyProjectConfigured: true,
      aisensyCampaigns: over.campaigns ?? [campaign],
      aisensyTemplates: over.templates ?? [template],
    },
  },
});

describe('SentVariables', () => {
  it('shows every value against the placeholder it filled', () => {
    const { container } = renderWithProviders(
      <SentVariables params={['Meera', 'Court 2']} body={BODY} />
    );

    expect(container.textContent).toContain('{{1}}');
    expect(container.textContent).toContain('Meera');
    expect(container.textContent).toContain('{{2}}');
    expect(container.textContent).toContain('Court 2');
  });

  it('names a value from the scenario registry when the registry declares one', () => {
    const { container } = renderWithProviders(
      <SentVariables params={['Meera']} labels={['Recipient name']} body={BODY} />
    );

    expect(container.textContent).toContain('Recipient name');
  });

  it('falls back to the sentence the value landed in when nothing names it', () => {
    // A campaign send has no registry entry, so the template's own wording is
    // the only thing that can say what {{2}} was for.
    const { container } = renderWithProviders(
      <SentVariables params={['Meera', 'Court 2']} body={BODY} />
    );

    expect(container.textContent).toContain('starts in an hour');
  });

  it('says a value went out EMPTY — the bubble cannot show that at all', () => {
    const { container } = renderWithProviders(<SentVariables params={['Meera', '']} body={BODY} />);

    expect(container.textContent).toContain('Empty');
  });

  it('says so plainly when the message carries no values', () => {
    const { container } = renderWithProviders(<SentVariables params={[]} body={BODY} />);

    expect(container.textContent).toContain('This message carries no values.');
  });
});

describe('SentMessage', () => {
  it('draws the message as it arrived, with the send values in place', async () => {
    const { container } = renderWithProviders(
      <SentMessage campaignName="pod_reminder_live" params={['Meera', 'Court 2']} />,
      { mocks: [catalogue()] }
    );
    await flush();

    // The bubble is the sentence, not the template: no placeholder survives in
    // it. (The values list below quotes the raw wording on purpose, so the
    // assertion is on the bubble's own text.)
    expect(container.textContent).toContain('Hi Meera, your pod at Court 2 starts in an hour.');
  });

  it('lists the values under the message as well as drawing them into it', async () => {
    const { container } = renderWithProviders(
      <SentMessage
        campaignName="pod_reminder_live"
        params={['Meera', 'Court 2']}
        labels={['Recipient name', 'Venue']}
      />,
      { mocks: [catalogue()] }
    );
    await flush();

    expect(container.textContent).toContain('Recipient name');
    expect(container.textContent).toContain('Venue');
  });

  it('shows the caller note for a send whose values are filled per person', async () => {
    const { container } = renderWithProviders(
      <SentMessage campaignName="pod_reminder_live" params={['{{first_name}}']} note="Per person" />,
      { mocks: [catalogue()] }
    );
    await flush();

    expect(container.textContent).toContain('Per person');
  });

  it('says the wording is unavailable when AiSensy has no template for the campaign', async () => {
    const { container } = renderWithProviders(
      <SentMessage campaignName="deleted_campaign" params={['Meera']} />,
      { mocks: [catalogue()] }
    );
    await flush();

    expect(container.textContent).toContain('AiSensy could not say which template');
    // The values are the record either way, so they still show.
    expect(container.textContent).toContain('Meera');
  });

  it('never asks AiSensy for a send that carries no campaign name', async () => {
    // No mock is provided: a request would make MockedProvider throw.
    const { container } = renderWithProviders(<SentMessage campaignName="" params={['Meera']} />);
    await flush();

    expect(container.textContent).toContain('AiSensy could not say which template');
  });
});

/**
 * One person's own copy of a campaign send.
 *
 * A campaign's values are resolved per person while the walk runs, so the
 * campaign's own preview is the SHAPE and this is the message — the answer to
 * the only question a complaint ever asks. And a person the send never reached
 * gets no bubble at all: drawing one would put words on screen that nobody read.
 */
describe('RecipientMessageDialog', () => {
  const recipient = (over: Record<string, unknown> = {}) => ({
    id: 'rcp-1',
    name: 'Meera Nair',
    destination: '919876543210',
    status: 'SENT',
    reason: '',
    submitted_message_id: 'aisensy-1',
    template_params: ['Meera', 'Court 2'],
    attempts: 1,
    created_at: '2026-08-20T09:00:00.000Z',
    updated_at: '2026-08-20T09:00:00.000Z',
    ...over,
  });

  it('draws the message this person got, with their own values in it', async () => {
    const { container } = renderWithProviders(
      <RecipientMessageDialog
        recipient={recipient() as never}
        campaignName="pod_reminder_live"
        onClose={() => undefined}
      />,
      { mocks: [catalogue()] }
    );
    await flush();

    expect(container.ownerDocument.body.textContent).toContain(
      'Hi Meera, your pod at Court 2 starts in an hour.'
    );
  });

  it('draws no message for somebody the send never reached', async () => {
    const { container } = renderWithProviders(
      <RecipientMessageDialog
        recipient={recipient({ status: 'SKIPPED', reason: 'No WhatsApp number' }) as never}
        campaignName="pod_reminder_live"
        onClose={() => undefined}
      />,
      { mocks: [catalogue()] }
    );
    await flush();
    const text = container.ownerDocument.body.textContent ?? '';

    expect(text).toContain('No WhatsApp number');
    expect(text).toContain('Nothing arrived for this person');
    expect(text).not.toContain('starts in an hour');
    // The values it was carrying are still the record.
    expect(text).toContain('Meera');
  });

  it('renders nothing to open when no row has been clicked', () => {
    const { container } = renderWithProviders(
      <RecipientMessageDialog recipient={null} campaignName="pod_reminder_live" onClose={() => undefined} />
    );

    expect(container.ownerDocument.body.textContent).not.toContain('Meera');
  });
});
