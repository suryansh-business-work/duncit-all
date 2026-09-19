import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import LeadSurveyTab from '@/components/lead-survey/LeadSurveyTab';
import LeadSurveyFields from '@/components/lead-survey/LeadSurveyFields';
import {
  DELETE_LEAD_SURVEY_ENTRY,
  GENERATE_LEAD_SURVEY_LINK,
  LEAD_SURVEY,
  REVOKE_LEAD_SURVEY_LINK,
  SAVE_LEAD_SURVEY_RESPONSE,
  type LeadCategoryRef,
  type LeadSurveyDef,
  type LeadSurveyEntry,
} from '@/components/lead-survey/queries';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { entry, question, venueSurvey } from './fixtures';

const LEAD = 'venue-42';
const baseVars = { entity: 'VENUE_LEAD', lead_id: LEAD, category_id: null, sub_category_id: null };

interface SurveyData {
  survey?: LeadSurveyDef | null;
  entries?: LeadSurveyEntry[];
  categories?: LeadCategoryRef[];
  sub_categories?: LeadCategoryRef[];
}

const surveyMock = (data: SurveyData, variables: Record<string, unknown> = baseVars, uses = 10): MockedResponse => ({
  request: { query: LEAD_SURVEY, variables },
  result: {
    data: {
      leadSurvey: {
        survey: data.survey === undefined ? venueSurvey : data.survey,
        entries: data.entries ?? [],
        categories: data.categories ?? [],
        sub_categories: data.sub_categories ?? [],
      },
    },
  },
  maxUsageCount: uses,
});

const shortSurvey: LeadSurveyDef = { ...venueSurvey, questions: [question({ qid: 'q1', label: 'Venue name', required: true })] };
const linkEntry = entry({ id: 'e-link', source: 'LINK', token: 'tok-live' });
const filledEntry = entry({ id: 'e-filled', filled: true, answers: [{ qid: 'q1', value: 'Grand Hall', values: [] }] });

const writeText = vi.fn(() => Promise.resolve());

const renderTab = (mocks: MockedResponse[]) => renderWithApollo(<LeadSurveyTab entity="VENUE_LEAD" leadId={LEAD} />, mocks);

beforeEach(() => {
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
  writeText.mockReset();
  writeText.mockImplementation(() => Promise.resolve());
});

describe('LeadSurveyTab', () => {
  it('explains that no survey matches the lead’s category yet', async () => {
    renderTab([surveyMock({ survey: null })]);

    expect(await screen.findByText(/No onboarding survey matches this lead's category yet/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Survey' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate link' })).toBeNull();
  });

  it('lets a multi-category lead pick which survey to use', async () => {
    const categories = [
      { id: 'cat-1', name: 'Banquet' },
      { id: 'cat-2', name: 'Rooftop' },
    ];
    const subCategories = [
      { id: 'sub-1', name: 'Wedding' },
      { id: 'sub-2', name: 'Corporate' },
    ];
    renderTab([
      surveyMock({ survey: null, categories, sub_categories: subCategories }),
      surveyMock({ survey: null, categories, sub_categories: subCategories }, { ...baseVars, category_id: 'cat-2' }),
      surveyMock({ categories, sub_categories: subCategories }, { ...baseVars, category_id: 'cat-2', sub_category_id: 'sub-2' }),
    ]);

    expect(await screen.findByText('Multiple categories — pick which survey to use:')).toBeInTheDocument();
    expect(screen.getByText(/matches the selected category yet/)).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Category/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Rooftop' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Category/ })).toHaveTextContent('Rooftop'));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Sub-category/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Corporate' }));

    expect(await screen.findByRole('heading', { name: 'Venue onboarding' })).toBeInTheDocument();
  });

  it('opens and closes the manual form, and saves a filled survey', async () => {
    const save = vi.fn(() => ({ data: { saveLeadSurveyResponse: { id: 'e-new' } } }));
    renderTab([
      surveyMock({ survey: shortSurvey }),
      {
        request: {
          query: SAVE_LEAD_SURVEY_RESPONSE,
          variables: { entity: 'VENUE_LEAD', lead_id: LEAD, survey_id: 'survey-venue', answers: [{ qid: 'q1', value: 'Grand Hall' }] },
        },
        result: save,
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Fill manually' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
    expect(screen.queryByRole('textbox', { name: 'Venue name' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Fill manually' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Venue name' }), { target: { value: 'Grand Hall' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save survey' }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(await screen.findAllByText('Survey saved')).not.toHaveLength(0);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Venue name' })).toBeNull());
  });

  it('keeps the form open and shows why a save failed', async () => {
    renderTab([
      surveyMock({ survey: shortSurvey }),
      {
        request: {
          query: SAVE_LEAD_SURVEY_RESPONSE,
          variables: { entity: 'VENUE_LEAD', lead_id: LEAD, survey_id: 'survey-venue', answers: [{ qid: 'q1', value: 'Grand Hall' }] },
        },
        error: new Error('Survey was archived'),
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Fill manually' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Venue name' }), { target: { value: 'Grand Hall' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save survey' }));

    expect(await screen.findByText('Survey was archived')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Survey was archived')).toBeNull());
    expect(screen.getByRole('textbox', { name: 'Venue name' })).toBeInTheDocument();
  });

  it('opens an earlier entry prefilled for editing', async () => {
    renderTab([surveyMock({ survey: shortSurvey, entries: [filledEntry] })]);

    fireEvent.click(await screen.findByTestId('crm-lead-survey-entry-row'));

    expect(screen.getByRole('textbox', { name: 'Venue name' })).toHaveValue('Grand Hall');
  });

  it('generates a share link and copies it', async () => {
    renderTab([
      surveyMock({ entries: [] }),
      {
        request: { query: GENERATE_LEAD_SURVEY_LINK, variables: { entity: 'VENUE_LEAD', lead_id: LEAD, survey_id: 'survey-venue' } },
        result: { data: { generateLeadSurveyLink: { id: 'e-link', token: 'tok-new' } } },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Generate link' }));

    expect(await screen.findByText('Link generated & copied to clipboard')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/s/tok-new`);

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Link generated & copied to clipboard')).toBeNull());
  });

  it('still confirms the link when the clipboard refuses it', async () => {
    writeText.mockImplementation(() => Promise.reject(new Error('Clipboard blocked')));
    renderTab([
      surveyMock({ entries: [] }),
      {
        request: { query: GENERATE_LEAD_SURVEY_LINK, variables: { entity: 'VENUE_LEAD', lead_id: LEAD, survey_id: 'survey-venue' } },
        result: { data: { generateLeadSurveyLink: { id: 'e-link', token: 'tok-new' } } },
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Generate link' }));

    expect(await screen.findByText('Link generated & copied to clipboard')).toBeInTheDocument();
  });

  it('shows why a link could not be generated', async () => {
    renderTab([
      surveyMock({ entries: [] }),
      {
        request: { query: GENERATE_LEAD_SURVEY_LINK, variables: { entity: 'VENUE_LEAD', lead_id: LEAD, survey_id: 'survey-venue' } },
        error: new Error('Lead has no contact to send to'),
      },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Generate link' }));

    expect(await screen.findByText('Lead has no contact to send to')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Lead has no contact to send to')).toBeNull());
  });

  it('revokes a live link', async () => {
    const revoke = vi.fn(() => ({ data: { revokeLeadSurveyLink: true } }));
    renderTab([
      surveyMock({ entries: [linkEntry] }),
      { request: { query: REVOKE_LEAD_SURVEY_LINK, variables: { entry_id: 'e-link' } }, result: revoke },
    ]);

    fireEvent.click(await screen.findByTestId('crm-lead-survey-revoke'));

    await waitFor(() => expect(revoke).toHaveBeenCalled());
  });

  it('deletes an entry only after confirmation', async () => {
    const remove = vi.fn(() => ({ data: { deleteLeadSurveyEntry: true } }));
    renderTab([
      surveyMock({ entries: [linkEntry] }),
      { request: { query: DELETE_LEAD_SURVEY_ENTRY, variables: { entry_id: 'e-link' } }, result: remove },
    ]);

    fireEvent.click(await screen.findByTestId('crm-lead-survey-delete'));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete survey entry?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('crm-lead-survey-delete'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('closes the delete confirmation from the backdrop', async () => {
    renderTab([surveyMock({ entries: [linkEntry] })]);

    fireEvent.click(await screen.findByTestId('crm-lead-survey-delete'));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('LeadSurveyFields', () => {
  it('confirms a save with its own toast, which can be dismissed', async () => {
    const onSaved = vi.fn();
    renderWithApollo(<LeadSurveyFields entity="HOST_LEAD" leadId="host-9" survey={shortSurvey} onSaved={onSaved} />, [
      {
        request: {
          query: SAVE_LEAD_SURVEY_RESPONSE,
          variables: { entity: 'HOST_LEAD', lead_id: 'host-9', survey_id: 'survey-venue', answers: [{ qid: 'q1', value: 'Studio 5' }] },
        },
        result: { data: { saveLeadSurveyResponse: { id: 'e-host' } } },
      },
    ]);

    fireEvent.change(screen.getByRole('textbox', { name: 'Venue name' }), { target: { value: 'Studio 5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save survey' }));

    expect(await screen.findByText('Survey saved')).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Survey saved')).toBeNull());
  });
});
