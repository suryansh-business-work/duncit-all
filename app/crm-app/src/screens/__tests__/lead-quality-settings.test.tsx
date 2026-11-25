import { act, fireEvent, screen, within } from '@testing-library/react-native';

import * as docs from '@/graphql/leadQualitySettings';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ApiError } from '@/utils/errors';
import { LeadQualitySettingsScreen } from '../settings-lead-quality/LeadQualitySettingsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: undefined }),
}));

/** CRM › Settings › Lead Quality Score: the version in use, its draft, publish / discard / restore, the history. */

const request = gqlRequest as jest.Mock;
const sub = (
  key: string,
  name: string,
  points: number,
  auto_check: string,
  threshold: number | null,
  mandatory = false,
) => ({
  key,
  name,
  points,
  mandatory,
  auto_check,
  threshold,
  guidance: '',
});
const config = (version: number, status: string, revision: number, change_note: string) => ({
  id: `cfg${version}`,
  version,
  status,
  min_qualification_score: 61,
  change_note,
  revision,
  weightage_total: 100,
  published_at: status === 'PUBLISHED' ? '2026-11-20T10:00:00.000Z' : null,
  updated_at: '2026-11-24T09:30:00.000Z',
  updated_by: { name: 'Ravi' },
  published_by: status === 'PUBLISHED' ? { name: 'Asha' } : null,
  bands: [
    { key: 'high', label: 'High', min: 80, tone: 'success' },
    { key: 'low', label: 'Low', min: 0, tone: 'error' },
  ],
  criteria: [
    {
      key: 'instagram',
      name: 'Instagram',
      weightage: 40,
      enabled: true,
      mandatory: true,
      auto_check: 'NONE',
      threshold: null,
      guidance: 'Check the profile',
      sub_criteria: [
        sub('followers', 'Followers', 25, 'INSTAGRAM_FOLLOWERS_MIN', 1000),
        sub('business', 'Business profile', 15, 'INSTAGRAM_BUSINESS_PROFILE', null, true),
      ],
    },
    {
      key: 'unique',
      name: 'Unique',
      weightage: 60,
      enabled: true,
      mandatory: false,
      auto_check: 'CRM_UNIQUENESS',
      threshold: null,
      guidance: '',
      sub_criteria: [],
    },
  ],
});
const PUBLISHED = config(3, 'PUBLISHED', 2, 'First model');
const DRAFT = config(4, 'DRAFT', 7, 'Tightened Instagram');
let draft: ReturnType<typeof config> | null = null;
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadQualitySettingsDocument)
      return { crmLeadQualitySettings: { lead_type: vars.lead_type, published: PUBLISHED, draft } };
    if (doc === docs.CrmAppLeadQualityVersionsDocument)
      return {
        crmLeadQualityVersions: [
          { ...PUBLISHED, version: 2, id: 'v2', status: 'ARCHIVED' },
          PUBLISHED,
          ...(draft ? [draft] : []),
        ],
      };
    if (doc === docs.CrmAppLeadQualitySettingsHistoryDocument)
      return {
        crmLeadQualitySettingsHistory: [
          {
            id: 'e1',
            kind: 'CONFIG_PUBLISH',
            config_version: 3,
            note: 'First model',
            created_at: '2026-11-20T10:00:00.000Z',
            actor: { name: 'Asha' },
          },
          {
            id: 'e2',
            kind: 'CONFIG_DRAFT',
            config_version: 4,
            note: '',
            created_at: '2026-11-24T09:30:00.000Z',
            actor: { name: 'Ravi' },
          },
          {
            id: 'e3',
            kind: 'SCORE',
            config_version: null,
            note: 'Rescored',
            created_at: '2026-11-21T10:00:00.000Z',
            actor: { name: '' },
          },
        ],
      };
    if (doc === docs.CrmAppSaveLeadQualityDraftDocument)
      return { saveCrmLeadQualityDraft: { id: 'cfg4', version: 4, revision: 8 } };
    if (doc === docs.CrmAppPublishLeadQualityConfigDocument)
      return {
        publishCrmLeadQualityConfig: {
          recalculation_job_id: 'job1',
          config: { id: 'cfg4', version: 4 },
        },
      };
    if (doc === docs.CrmAppDeleteLeadQualityDraftDocument)
      return { deleteCrmLeadQualityDraft: true };
    if (doc === docs.CrmAppStartLeadQualityDraftDocument)
      return { startCrmLeadQualityDraftFromVersion: { id: 'cfg5', version: 5 } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = async (testID: string) =>
  act(async () => fireEvent.press(screen.getByTestId(testID)));

beforeEach(() => {
  jest.clearAllMocks();
  draft = null;
  serve();
});

describe('LeadQualitySettingsScreen without a draft', () => {
  it('shows the published model read-only and starts a draft from it with Edit', async () => {
    renderWithTheme(<LeadQualitySettingsScreen />);
    expect(await screen.findByText('Published version 3')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Lead Quality Score' });
    expect(callsTo(docs.CrmAppLeadQualitySettingsDocument)[0]?.[1]).toEqual({
      lead_type: 'HOST_LEAD',
    });
    expect(screen.getByText(/^Published by Asha on /)).toBeOnTheScreen();
    expect(screen.getByTestId('lead-quality-draft-status')).toHaveTextContent(
      'No draft. The published version is shown read-only; choose Edit to start a draft from it.',
    );
    expect(screen.getByTestId('lead-quality-summary')).toBeOnTheScreen();
    expect(screen.getByText('Followers')).toBeOnTheScreen();
    expect(screen.getByText('Green')).toBeOnTheScreen();
    expect(screen.getByText('Minimum qualifying score: 61')).toBeOnTheScreen();
    await press('lead-quality-edit');
    expect(callsTo(docs.CrmAppStartLeadQualityDraftDocument)[0]?.[1]).toEqual({
      lead_type: 'HOST_LEAD',
      version: 3,
    });
    expect(await screen.findByText('Draft version 5 started from version 3.')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadQualitySettingsDocument).length).toBeGreaterThan(1);
  });

  it('switches lead type and reads that type’s model', async () => {
    renderWithTheme(<LeadQualitySettingsScreen />);
    await screen.findByText('Published version 3');
    await press('lead-quality-tab-VENUE_LEAD');
    expect(callsTo(docs.CrmAppLeadQualitySettingsDocument).at(-1)?.[1]).toEqual({
      lead_type: 'VENUE_LEAD',
    });
  });

  it('offers a retry when the model cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadQualitySettingsDocument, () => Promise.reject(new Error('Server down'))],
      ]),
    );
    renderWithTheme(<LeadQualitySettingsScreen />);
    expect(await screen.findByText('Server down')).toBeOnTheScreen();
    expect(screen.getByTestId('state-retry')).toBeOnTheScreen();
  });

  it('restores an older version as the draft after confirming, and lists the settings changes', async () => {
    renderWithTheme(<LeadQualitySettingsScreen />);
    await screen.findByText('Published version 3');
    expect(screen.getByText('Other change')).toBeOnTheScreen();
    expect(screen.getByText('Draft saved')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('lead-quality-change-log-search'), 'ravi');
    expect(screen.queryByText('Other change')).toBeNull();
    fireEvent.changeText(screen.getByTestId('lead-quality-change-log-search'), 'nothing like this');
    expect(screen.getByText('No settings changes yet.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('lead-quality-versions-search'), 'archived');
    expect(screen.queryByTestId('lead-quality-version-3')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-quality-restore-2'));
    expect(screen.getByText('Restore version 2 as the draft?')).toBeOnTheScreen();
    await press('lead-quality-confirm-confirm');
    expect(callsTo(docs.CrmAppStartLeadQualityDraftDocument)[0]?.[1]).toEqual({
      lead_type: 'HOST_LEAD',
      version: 2,
    });
    expect(await screen.findByText('Draft version 5 started from version 2.')).toBeOnTheScreen();
  });
});

describe('LeadQualitySettingsScreen with a draft', () => {
  beforeEach(() => {
    draft = DRAFT;
  });

  it('refuses to publish short of 100% but saves the draft with its revision', async () => {
    renderWithTheme(<LeadQualitySettingsScreen />);
    expect(await screen.findByText('Weightage adds up to 100%.')).toBeOnTheScreen();
    expect(screen.getByTestId('lead-quality-draft-status')).toHaveTextContent(
      /^Draft version 4, last saved by Ravi on /,
    );
    // The draft itself cannot be restored as the draft; the published version can.
    expect(screen.getByTestId('lead-quality-restore-4')).toBeDisabled();
    expect(screen.getByTestId('lead-quality-restore-3')).not.toBeDisabled();
    fireEvent.changeText(screen.getByTestId('lead-quality-criterion-1-weightage'), '55');
    expect(
      await screen.findByText('Allocate the remaining 5% before publishing.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 problem to fix before publishing.')).toBeOnTheScreen();
    await press('lead-quality-publish');
    expect(
      screen.getByText('This version cannot be published yet. Fix the problems shown above.'),
    ).toBeOnTheScreen();
    await press('lead-quality-save');
    const [, vars] = callsTo(docs.CrmAppSaveLeadQualityDraftDocument)[0] ?? [];
    expect(vars).toMatchObject({
      lead_type: 'HOST_LEAD',
      revision: 7,
      change_note: 'Tightened Instagram',
    });
    expect(vars.input.criteria[1]).toEqual(
      expect.objectContaining({ key: 'unique', weightage: 55 }),
    );
    expect(await screen.findByText('Draft saved.')).toBeOnTheScreen();
  });

  it('publishes an unchanged draft after confirming', async () => {
    renderWithTheme(<LeadQualitySettingsScreen />);
    await screen.findByText('Ready to publish.');
    await press('lead-quality-publish');
    expect(screen.getByText('Publish version 4?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Every Host lead in the CRM is rescored with this version in a background job. The version in use now is archived and stays in the history.',
      ),
    ).toBeOnTheScreen();
    await press('lead-quality-confirm-confirm');
    expect(callsTo(docs.CrmAppSaveLeadQualityDraftDocument)).toHaveLength(0);
    expect(callsTo(docs.CrmAppPublishLeadQualityConfigDocument)[0]?.[1]).toEqual({
      lead_type: 'HOST_LEAD',
      revision: 7,
      change_note: 'Tightened Instagram',
    });
    expect(
      await screen.findByText(
        'Version 4 is live. Every lead of this type is being rescored in the background.',
      ),
    ).toBeOnTheScreen();
  });

  it('saves unsaved edits first and publishes the revision that save returned', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppPublishLeadQualityConfigDocument,
          () => ({
            publishCrmLeadQualityConfig: {
              recalculation_job_id: null,
              config: { id: 'cfg4', version: 4 },
            },
          }),
        ],
      ]),
    );
    renderWithTheme(<LeadQualitySettingsScreen />);
    fireEvent.changeText(await screen.findByTestId('lead-quality-change-note'), 'Final');
    await press('lead-quality-publish');
    await press('lead-quality-confirm-confirm');
    expect(callsTo(docs.CrmAppSaveLeadQualityDraftDocument)[0]?.[1]).toMatchObject({
      revision: 7,
      change_note: 'Final',
    });
    expect(callsTo(docs.CrmAppPublishLeadQualityConfigDocument)[0]?.[1]).toMatchObject({
      revision: 8,
      change_note: 'Final',
    });
    expect(
      await screen.findByText('Version 4 is live. There are no leads of this type to rescore yet.'),
    ).toBeOnTheScreen();
  });

  it('discards the draft after confirming, and keeps the dialog shut on Cancel', async () => {
    renderWithTheme(<LeadQualitySettingsScreen />);
    await screen.findByText('Draft v4');
    fireEvent.press(screen.getByTestId('lead-quality-discard'));
    expect(screen.getByText('Discard draft version 4?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('lead-quality-confirm-cancel'));
    expect(callsTo(docs.CrmAppDeleteLeadQualityDraftDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('lead-quality-discard'));
    await press('lead-quality-confirm-confirm');
    expect(callsTo(docs.CrmAppDeleteLeadQualityDraftDocument)[0]?.[1]).toEqual({
      lead_type: 'HOST_LEAD',
    });
    expect(
      await screen.findByText('Draft discarded. The published version stays in use.'),
    ).toBeOnTheScreen();
  });

  it('asks for a reload after a conflict, and reads everything again', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppSaveLeadQualityDraftDocument,
          () => Promise.reject(new ApiError('Conflict', 200, { code: 'CONFLICT' })),
        ],
      ]),
    );
    renderWithTheme(<LeadQualitySettingsScreen />);
    await screen.findByText('Ready to publish.');
    await press('lead-quality-save');
    expect(
      screen.getByText(
        'Someone else changed this draft after you opened it. Reload to see their changes.',
      ),
    ).toBeOnTheScreen();
    const reads = callsTo(docs.CrmAppLeadQualitySettingsDocument).length;
    await press('lead-quality-reload');
    expect(callsTo(docs.CrmAppLeadQualitySettingsDocument).length).toBe(reads + 1);
    expect(screen.queryByTestId('lead-quality-failure')).toBeNull();
  });

  it('puts the server’s listed problems on their fields, and shows any other refusal as said', async () => {
    const issues = [
      { path: 'criteria.0.name', code: 'NAME_REQUIRED', message: 'Enter a name.' },
      { path: 'bands', code: 'BAND_ZERO_MISSING', message: 'x' },
    ];
    let refusal: Error = new ApiError('Invalid', 200, { code: 'BAD_USER_INPUT', issues });
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppSaveLeadQualityDraftDocument, () => Promise.reject(refusal)],
      ]),
    );
    renderWithTheme(<LeadQualitySettingsScreen />);
    await screen.findByText('Ready to publish.');
    await press('lead-quality-save');
    expect(
      screen.getByText(
        'The server refused this configuration. Fix the highlighted problems and save again.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('One band must start at 0 so every score has a classification.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Enter a name.')).toBeOnTheScreen();
    expect(screen.queryByTestId('lead-quality-failure')).toBeNull();
    refusal = new Error('Network down');
    await press('lead-quality-save');
    expect(
      within(screen.getByTestId('lead-quality-failure')).getByText('Network down'),
    ).toBeOnTheScreen();
  });
});
