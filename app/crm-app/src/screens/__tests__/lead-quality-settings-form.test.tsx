import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { LeadQualityConfigForm } from '@/forms/lead-quality-config';
import type { QualityConfig } from '@/features/lead-quality-settings/editor';
import { renderWithTheme } from '@/test-utils';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));

/** The Lead Quality Score draft editor: criteria, sub-criteria, checks, qualification and bands, checked live. */

const sub = (
  key: string,
  name: string,
  points: number,
  auto_check: string,
  threshold: number | null,
) => ({
  key,
  name,
  points,
  mandatory: false,
  auto_check,
  threshold,
  guidance: '',
});
const DRAFT = {
  id: 'cfg4',
  version: 4,
  status: 'DRAFT',
  min_qualification_score: 61,
  change_note: '',
  revision: 7,
  weightage_total: 100,
  published_at: null,
  updated_at: null,
  updated_by: { name: 'Ravi' },
  published_by: null,
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
      guidance: '',
      sub_criteria: [
        sub('followers', 'Followers', 25, 'INSTAGRAM_FOLLOWERS_MIN', 1000),
        sub('business', 'Business', 15, 'NONE', null),
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
} as unknown as QualityConfig;

const onSaveDraft = jest.fn();
const onPublish = jest.fn();
const renderForm = () =>
  renderWithTheme(
    <LeadQualityConfigForm
      config={DRAFT}
      busy={false}
      serverIssues={[]}
      onSaveDraft={onSaveDraft}
      onPublish={onPublish}
    />,
  );
const value = (testID: string) => screen.getByTestId(testID).props.value;

beforeEach(() => jest.clearAllMocks());

describe('LeadQualityConfigForm', () => {
  it('totals each criterion’s sub-criteria against its weightage, live', async () => {
    renderForm();
    expect(screen.getByText('Sub-criteria points: 40 of 40')).toBeOnTheScreen();
    expect(screen.getByText('Sub-criteria points add up to the weightage.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('lead-quality-sub-0-0-points'), '30');
    expect(
      await screen.findByText("Sub-criteria points are 5 over this criterion's weightage."),
    ).toBeOnTheScreen();
    expect(screen.getByText('Weightage adds up to 100%.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('lead-quality-sub-0-0-points'), '20');
    expect(
      await screen.findByText('Give out the remaining 5 points before publishing.'),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('lead-quality-criterion-0-weightage'), 'abc');
    expect(
      await screen.findByText('Fix the weightage values to see whether they add up to 100%.'),
    ).toBeOnTheScreen();
  });

  it('asks for a threshold only for a check that compares against a number', async () => {
    renderForm();
    expect(value('lead-quality-sub-0-0-threshold')).toBe('1000');
    expect(screen.getByText('The fewest Instagram followers that pass.')).toBeOnTheScreen();
    expect(screen.queryByTestId('lead-quality-criterion-0-check-NONE')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-quality-sub-0-0-check-NONE'));
    expect(screen.queryByTestId('lead-quality-sub-0-0-threshold')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-quality-criterion-1-check-GOOGLE_REVIEWS_MIN'));
    expect(screen.getByText('The fewest Google reviews that pass.')).toBeOnTheScreen();
  });

  it('drops the minimum score while a lead qualifies on its gates alone', () => {
    renderForm();
    expect(value('lead-quality-min-score')).toBe('61');
    fireEvent.press(screen.getByTestId('lead-quality-gates-only'));
    expect(screen.queryByTestId('lead-quality-min-score')).toBeNull();
  });

  it('adds, moves and deletes criteria and sub-criteria', async () => {
    renderForm();
    fireEvent.press(screen.getByTestId('lead-quality-criterion-0-down'));
    expect(value('lead-quality-criterion-0-name')).toBe('Unique');
    fireEvent.press(screen.getByTestId('lead-quality-criterion-1-up'));
    expect(value('lead-quality-criterion-0-name')).toBe('Instagram');
    fireEvent.press(screen.getByTestId('lead-quality-add-criterion'));
    expect(value('lead-quality-criterion-2-weightage')).toBe('0');
    expect(screen.getByLabelText('Criterion 3: Untitled')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('lead-quality-add-sub-1'));
    expect(value('lead-quality-sub-1-0-points')).toBe('0');
    fireEvent.press(screen.getByTestId('lead-quality-sub-0-1-delete'));
    expect(screen.queryByTestId('lead-quality-sub-0-1')).toBeNull();
    fireEvent.press(screen.getByTestId('lead-quality-criterion-1-delete'));
    expect(
      await screen.findByText('Allocate the remaining 60% before publishing.'),
    ).toBeOnTheScreen();
  });

  it('needs a band starting at 0, and adds a yellow band', async () => {
    renderForm();
    fireEvent.press(screen.getByTestId('lead-quality-add-band'));
    expect(value('lead-quality-band-2-label')).toBe('');
    fireEvent.press(screen.getByTestId('lead-quality-band-1-delete'));
    // The alert's text, without its icon glyph.
    const alert = await screen.findByTestId('lead-quality-bands-issue-BAND_ZERO_MISSING');
    expect(
      within(alert).getByText('One band must start at 0 so every score has a classification.'),
    ).toBeOnTheScreen();
  });

  it('hands Save draft and Publish the exact input, publishing only a configuration that passes', async () => {
    renderForm();
    await act(async () => fireEvent.press(screen.getByTestId('lead-quality-publish')));
    expect(onPublish).toHaveBeenCalledWith(
      expect.objectContaining({ dirty: false, change_note: '' }),
    );
    fireEvent.changeText(screen.getByTestId('lead-quality-change-note'), ' Raised the bar ');
    await act(async () => fireEvent.press(screen.getByTestId('lead-quality-save')));
    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ dirty: true, change_note: 'Raised the bar' }),
    );
    expect(onSaveDraft.mock.calls[0]?.[0].input.min_qualification_score).toBe(61);
    fireEvent.changeText(screen.getByTestId('lead-quality-criterion-0-name'), '');
    await act(async () => fireEvent.press(screen.getByTestId('lead-quality-save')));
    expect(screen.getByText('Enter a name.')).toBeOnTheScreen();
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    await act(async () => fireEvent.press(screen.getByTestId('lead-quality-publish')));
    expect(
      screen.getByText('This version cannot be published yet. Fix the problems shown above.'),
    ).toBeOnTheScreen();
    expect(onPublish).toHaveBeenCalledTimes(1);
  });
});
