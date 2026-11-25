import { Share } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import * as docs from '@/graphql/leadTabsB';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { SurveyTab } from '../lead/tabs/SurveyTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Lead › Survey: fill it as a stepper, share a link, and the log of every generation and response. */

const request = gqlRequest as jest.Mock;
const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
const q = (qid: string, type: string, over: Record<string, unknown> = {}) => ({
  qid,
  type,
  label: qid,
  help: null,
  required: false,
  multi: false,
  options: [],
  ...over,
});
const SURVEY = {
  id: 's1',
  title: 'Venue onboarding',
  questions: [
    q('sec1', 'SECTION', { label: 'About the venue', help: 'The basics' }),
    q('Venue name', 'TEXT', { required: true }),
    q('Amenities', 'MCQ', { required: true, multi: true, options: ['Parking', 'Wi-Fi'] }),
    q('sec2', 'SECTION', { label: 'Space' }),
    q('Setting', 'MCQ', { options: ['Indoor', 'Outdoor'] }),
    q('Anything else', 'TEXTAREA'),
  ],
};
const entry = (over: Record<string, unknown>) => ({
  id: 'e1',
  source: 'MANUAL',
  token: null,
  token_revoked: false,
  generated_by: 'Asha',
  filled: true,
  submitted_at: '2026-11-20T10:00:00.000Z',
  submitted_by: 'Asha',
  created_at: '2026-11-20T09:00:00.000Z',
  answers: [
    { qid: 'Venue name', value: 'Grand Hall', values: [] },
    { qid: 'Amenities', value: null, values: ['Parking'] },
    { qid: 'gone', value: '', values: [] },
  ],
  ...over,
});
const ENTRIES = [
  entry({}),
  entry({
    id: 'e2',
    source: 'LINK',
    token: 'tok2',
    filled: false,
    submitted_at: null,
    submitted_by: null,
    answers: [],
  }),
  entry({
    id: 'e3',
    source: 'LINK',
    token: 'tok3',
    token_revoked: true,
    filled: false,
    generated_by: null,
    answers: [],
  }),
];
const LEAD: Lead = {
  id: 'v1',
  name: 'Grand Hall',
  city: 'Pune',
  lead_status: 'New',
  priority: 'Medium',
  assigned_to: null,
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const result = (over: Record<string, unknown> = {}) => ({
  leadSurvey: {
    survey: SURVEY,
    entries: ENTRIES,
    categories: [{ id: 'c1', name: 'Turf' }],
    sub_categories: [],
    ...over,
  },
});
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadSurveyDocument) return result();
    if (doc === docs.CrmAppSaveLeadSurveyDocument) return { saveLeadSurveyResponse: { id: 'e9' } };
    if (doc === docs.CrmAppGenerateSurveyLinkDocument)
      return { generateLeadSurveyLink: { id: 'e8', token: 'tok8' } };
    if (doc === docs.CrmAppRevokeSurveyLinkDocument) return { revokeLeadSurveyLink: true };
    if (doc === docs.CrmAppDeleteSurveyEntryDocument) return { deleteLeadSurveyEntry: true };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const renderTab = (kind: 'VENUE_LEAD' | 'ECOMM_LEAD' = 'VENUE_LEAD') =>
  renderWithTheme(<SurveyTab kind={kind} id="v1" lead={LEAD} onChanged={jest.fn()} />);

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('SurveyTab', () => {
  it('lists every generation and response with its source, state, times and actions', async () => {
    renderTab();
    expect(await screen.findByText('Venue onboarding')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadSurveyDocument)[0]?.[1]).toEqual({
      entity: 'VENUE_LEAD',
      lead_id: 'v1',
      category_id: null,
      sub_category_id: null,
    });
    expect(screen.getByText('Filled')).toBeOnTheScreen();
    expect(screen.getByText('Pending')).toBeOnTheScreen();
    expect(screen.getByText('Revoked')).toBeOnTheScreen();
    expect(screen.getAllByText('by Asha')).toHaveLength(4);
    // Only the live link can be shared or revoked; only the filled entry has answers.
    expect(screen.getByTestId('survey-share-e2')).toBeOnTheScreen();
    expect(screen.queryByTestId('survey-share-e3')).toBeNull();
    expect(screen.queryByTestId('survey-view-e2')).toBeNull();
    expect(screen.queryByTestId('survey-picker')).toBeNull();
  });

  it('shows a filled entry’s answers under their questions', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('survey-view-e1'));
    expect(screen.getByText('Survey answers')).toBeOnTheScreen();
    expect(screen.getByText('Grand Hall')).toBeOnTheScreen();
    expect(screen.getByText('Parking')).toBeOnTheScreen();
    expect(screen.getByText('gone')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-answers-close'));
    expect(screen.queryByText('Survey answers')).toBeNull();
  });

  it('fills the survey step by step, refusing a missing required answer, then saves it', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('survey-fill-toggle'));
    expect(screen.getByText('Step 1 of 2')).toBeOnTheScreen();
    expect(screen.getByText('About the venue')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-next'));
    expect(screen.getByText('Please answer: Venue name')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('survey-Venue name'), 'Grand Hall');
    fireEvent.press(screen.getByTestId('survey-next'));
    expect(screen.getByText('Please answer: Amenities')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-Amenities-Parking'));
    fireEvent.press(screen.getByTestId('survey-Amenities-Wi-Fi'));
    fireEvent.press(screen.getByTestId('survey-Amenities-Wi-Fi'));
    fireEvent.press(screen.getByTestId('survey-next'));
    expect(screen.getByText('Step 2 of 2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-back'));
    expect(screen.getByTestId('survey-Venue name').props.value).toBe('Grand Hall');
    fireEvent.press(screen.getByTestId('survey-next'));
    fireEvent.press(screen.getByTestId('survey-Setting-Outdoor'));
    fireEvent.changeText(screen.getByTestId('survey-Anything else'), 'Rooftop');
    await act(async () => fireEvent.press(screen.getByTestId('survey-save')));
    expect(callsTo(docs.CrmAppSaveLeadSurveyDocument)[0]?.[1]).toEqual({
      entity: 'VENUE_LEAD',
      lead_id: 'v1',
      survey_id: 's1',
      answers: [
        { qid: 'Venue name', value: 'Grand Hall' },
        { qid: 'Amenities', values: ['Parking'] },
        { qid: 'Setting', value: 'Outdoor' },
        { qid: 'Anything else', value: 'Rooftop' },
      ],
    });
    expect(await screen.findByText('Survey saved')).toBeOnTheScreen();
    expect(screen.queryByTestId('survey-fill')).toBeNull();
    fireEvent.press(screen.getByTestId('survey-saved-close'));
    expect(screen.queryByText('Survey saved')).toBeNull();
  });

  it('opens an entry prefilled, and keeps the form with the reason when saving fails', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppSaveLeadSurveyDocument, () => Promise.reject(new Error('Survey closed'))],
      ]),
    );
    renderTab();
    fireEvent.press(await screen.findByTestId('survey-entry-e1'));
    expect(screen.getByTestId('survey-Venue name').props.value).toBe('Grand Hall');
    fireEvent.press(screen.getByTestId('survey-next'));
    await act(async () => fireEvent.press(screen.getByTestId('survey-save')));
    expect(await screen.findByText('Survey closed')).toBeOnTheScreen();
    expect(screen.getByTestId('survey-fill')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-error-close'));
    fireEvent.press(screen.getByTestId('survey-fill-toggle'));
    expect(screen.queryByTestId('survey-fill')).toBeNull();
  });

  it('generates a share link and offers it, shares and revokes a live link, and deletes after confirming', async () => {
    renderTab();
    await act(async () => fireEvent.press(await screen.findByTestId('survey-generate-link')));
    expect(callsTo(docs.CrmAppGenerateSurveyLinkDocument)[0]?.[1]).toEqual({
      entity: 'VENUE_LEAD',
      lead_id: 'v1',
      survey_id: 's1',
    });
    expect(share).toHaveBeenCalledWith({ message: expect.stringMatching(/\/s\/tok8$/) });
    await act(async () => fireEvent.press(screen.getByTestId('survey-share-e2')));
    expect(share).toHaveBeenLastCalledWith({ message: expect.stringMatching(/\/s\/tok2$/) });
    await act(async () => fireEvent.press(screen.getByTestId('survey-revoke-e2')));
    expect(callsTo(docs.CrmAppRevokeSurveyLinkDocument)[0]?.[1]).toEqual({ entry_id: 'e2' });

    fireEvent.press(screen.getByTestId('survey-delete-e3'));
    expect(screen.getByText('Delete survey entry?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-delete-cancel'));
    fireEvent.press(screen.getByTestId('survey-delete-e3'));
    await act(async () => fireEvent.press(screen.getByTestId('survey-delete-confirm')));
    expect(callsTo(docs.CrmAppDeleteSurveyEntryDocument)[0]?.[1]).toEqual({ entry_id: 'e3' });
  });

  it('says when no survey matches, lets a lead in several categories pick one, and shows an empty log', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppLeadSurveyDocument,
          (vars) =>
            vars.category_id
              ? result({
                  entries: [],
                  categories: [
                    { id: 'c1', name: 'Turf' },
                    { id: 'c2', name: 'Cafe' },
                  ],
                  sub_categories: [
                    { id: 'x1', name: 'Rooftop' },
                    { id: 'x2', name: 'Lawn' },
                  ],
                })
              : result({
                  survey: null,
                  entries: [],
                  categories: [
                    { id: 'c1', name: 'Turf' },
                    { id: 'c2', name: 'Cafe' },
                  ],
                }),
        ],
      ]),
    );
    renderTab();
    expect(
      await screen.findByText(/^No onboarding survey matches the selected category yet/),
    ).toBeOnTheScreen();
    expect(screen.getByText('Multiple categories — pick which survey to use:')).toBeOnTheScreen();
    expect(screen.queryByTestId('survey-generate-link')).toBeNull();
    fireEvent.press(screen.getByTestId('survey-category-c2'));
    await waitFor(() =>
      expect(callsTo(docs.CrmAppLeadSurveyDocument).at(-1)?.[1]).toMatchObject({
        category_id: 'c2',
        sub_category_id: null,
      }),
    );
    fireEvent.press(await screen.findByTestId('survey-sub-category-x2'));
    await waitFor(() =>
      expect(callsTo(docs.CrmAppLeadSurveyDocument).at(-1)?.[1]).toMatchObject({
        category_id: 'c2',
        sub_category_id: 'x2',
      }),
    );
    expect(
      await screen.findByText(
        'No surveys generated yet. Click “Fill manually” or “Generate link”.',
      ),
    ).toBeOnTheScreen();
  });

  it('says a single-category lead has no survey yet, and retries a failed read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadSurveyDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadSurveyDocument, () => result({ survey: null, entries: [] })],
      ]),
    );
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(
      await screen.findByText(/^No onboarding survey matches this lead's category yet/),
    ).toBeOnTheScreen();
  });

  it('has no Survey for a kind the API keeps no surveys for', () => {
    renderTab('ECOMM_LEAD');
    expect(screen.queryByTestId('survey-tab')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});
