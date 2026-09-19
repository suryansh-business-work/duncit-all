import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import TemplateBodyPicker from '@/components/compose/TemplateBodyPicker';
import { RENDER, TEMPLATES, type EmailTemplate } from '@/api/emailTemplates.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { RATE_CARD, festiveGreeting, hostIntro, retiredOffer, venueWelcome } from './fixtures';

/** The picker renders on a 500 ms debounce; give it room. */
const RENDER_WAIT = { timeout: 3000 };

const templatesMock = (templates: EmailTemplate[]): MockedResponse => ({
  request: { query: TEMPLATES },
  result: { data: { emailTemplates: templates } },
  maxUsageCount: 5,
});

const renderMock = (mjml: string, outcome: { html?: string; errors?: string[]; error?: Error }): MockedResponse => ({
  request: { query: RENDER, variables: (vars: Record<string, unknown>) => vars.mjml === mjml },
  ...(outcome.error
    ? { error: outcome.error }
    : { result: { data: { renderEmailTemplate: { html: outcome.html ?? '', errors: outcome.errors ?? [], detected_variables: [] } } } }),
  maxUsageCount: 5,
});

const renderPicker = (mocks: MockedResponse[]) => {
  const onChange = vi.fn();
  renderWithApollo(
    <TemplateBodyPicker
      entity="VENUE_LEAD"
      variableValues={{ venue_name: 'Grand Hall' }}
      leadName="Meera"
      leadEmail="meera@grandhall.in"
      onChange={onChange}
    />,
    mocks,
  );
  return onChange;
};

const pick = async (name: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /Template/ }));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name }));
};

describe('TemplateBodyPicker', () => {
  it('offers only active templates for this lead type, plus static ones', async () => {
    const onChange = renderPicker([templatesMock([venueWelcome, festiveGreeting, hostIntro, retiredOffer])]);

    expect(screen.getByText('Loading templates…')).toBeInTheDocument();
    expect(await screen.findByText('Pick a saved template.')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith({ subject: '', html: '', ready: false, attachments: [] });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Template/ }));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Venue welcome', 'Festive greeting']);
  });

  it('points to Email Templates when none are usable', async () => {
    renderPicker([templatesMock([hostIntro, retiredOffer])]);
    expect(await screen.findByText('No active templates — create one under Email Templates.')).toBeInTheDocument();
  });

  it('fills every placeholder from the lead, renders it and hands back a ready email', async () => {
    const onChange = renderPicker([
      templatesMock([venueWelcome, festiveGreeting]),
      renderMock(venueWelcome.mjml, { html: '<p>Grand Hall {{ city }}</p>', errors: ['mj-text is misplaced'] }),
    ]);
    await screen.findByText('Pick a saved template.');

    await pick('Venue welcome');

    // Lead value → declared sample → email/name heuristics → blank.
    expect(screen.getByLabelText('venue_name')).toHaveValue('Grand Hall');
    expect(screen.getByLabelText('contact_email')).toHaveValue('meera@grandhall.in');
    expect(screen.getByLabelText('owner_name')).toHaveValue('Meera');
    expect(screen.getByLabelText('discount')).toHaveValue('10%');
    expect(screen.getByLabelText('city')).toHaveValue('');
    expect(screen.getByText('1 attachment(s) will be sent.')).toBeInTheDocument();

    await waitFor(
      () =>
        expect(onChange).toHaveBeenLastCalledWith({
          subject: 'Hi Grand Hall from ',
          html: '<p>Grand Hall </p>',
          ready: true,
          attachments: [RATE_CARD],
        }),
      RENDER_WAIT,
    );
    expect(screen.getByText('mj-text is misplaced')).toBeInTheDocument();
    expect(screen.getByTitle('template-preview')).toHaveAttribute('srcdoc', '<p>Grand Hall </p>');

    fireEvent.change(screen.getByLabelText('city'), { target: { value: 'Pune' } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ subject: 'Hi Grand Hall from Pune' })), RENDER_WAIT);
  });

  it('marks the email not ready when rendering fails', async () => {
    const onChange = renderPicker([
      templatesMock([venueWelcome]),
      renderMock(venueWelcome.mjml, { error: new Error('MJML render service unavailable') }),
    ]);
    await screen.findByText('Pick a saved template.');

    await pick('Venue welcome');

    expect(await screen.findByText('MJML render service unavailable', {}, RENDER_WAIT)).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ subject: 'Hi Grand Hall from ', html: '', ready: false, attachments: [RATE_CARD] });
  });

  it('sends a placeholder-free template as is, and is not ready while it renders empty', async () => {
    const onChange = renderPicker([templatesMock([festiveGreeting]), renderMock(festiveGreeting.mjml, { html: '' })]);
    await screen.findByText('Pick a saved template.');

    await pick('Festive greeting');

    await waitFor(
      () => expect(onChange).toHaveBeenLastCalledWith({ subject: 'Season greetings', html: '', ready: false, attachments: [] }),
      RENDER_WAIT,
    );
    expect(screen.queryByText(/attachment\(s\) will be sent/)).toBeNull();
    expect(screen.queryByText('Variable values (auto-filled from this lead — edit if needed)')).toBeNull();
  });
});
