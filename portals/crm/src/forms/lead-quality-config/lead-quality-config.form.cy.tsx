import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { configFixture, fixtureInput } from '../../../__tests__/unit-tests/lead-quality-settings/fixtures';
import type { AutoCheck } from '../../lib/generated/lead-quality-rules';
import { LeadQualityConfigForm, type LeadQualityConfigFormProps } from '.';

const renderForm = (props: Partial<LeadQualityConfigFormProps> = {}) => {
  const onSaveDraft = vi.fn();
  const onPublish = vi.fn();
  render(<LeadQualityConfigForm config={configFixture()} onSaveDraft={onSaveDraft} onPublish={onPublish} {...props} />);
  return { onSaveDraft, onPublish };
};

const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const totalMessage = () => screen.getByTestId('lead-quality-total-message');

/** Picks a check through the select's own input (the path browser autofill takes), without waiting on the menu's transitions. */
const pickCheck = (testId: string, check: AutoCheck) => fireEvent.change(screen.getByTestId(`${testId}-check`), { target: { value: check } });

describe('LeadQualityConfigForm', () => {
  it('shows the weightage total live: over 100 is an error, under 100 asks for the rest, 100 is valid', async () => {
    renderForm();
    expect(screen.getByTestId('lead-quality-total')).toHaveAttribute('data-state', 'valid');
    expect(totalMessage()).toHaveTextContent('Weightage adds up to 100%.');

    type('lead-quality-criterion-0-weightage', '25');
    await waitFor(() => expect(totalMessage()).toHaveTextContent('Weightage cannot exceed 100%.'));
    expect(screen.getByTestId('lead-quality-total')).toHaveAttribute('data-state', 'over');
    expect(screen.getByText('Total weightage: 105%')).toBeInTheDocument();

    type('lead-quality-criterion-0-weightage', '15');
    await waitFor(() => expect(totalMessage()).toHaveTextContent('Allocate the remaining 5% before publishing.'));
    expect(screen.getByTestId('lead-quality-total')).toHaveAttribute('data-state', 'under');

    type('lead-quality-criterion-0-weightage', '20');
    await waitFor(() => expect(totalMessage()).toHaveTextContent('Weightage adds up to 100%.'));
  });

  it("reports a criterion's sub-criteria over, short of and equal to its weightage", async () => {
    renderForm();
    const feedback = () => screen.getByTestId('lead-quality-sub-total-1');
    expect(feedback()).toHaveAttribute('data-state', 'success');

    type('lead-quality-sub-1-0-points', '40');
    await waitFor(() => expect(feedback()).toHaveTextContent("Sub-criteria points are 10 over this criterion's weightage."));
    expect(feedback()).toHaveTextContent('Sub-criteria points: 60 of 50');
    expect(feedback()).toHaveAttribute('data-state', 'error');

    type('lead-quality-sub-1-0-points', '25');
    await waitFor(() => expect(feedback()).toHaveTextContent('Give out the remaining 5 points before publishing.'));
    expect(feedback()).toHaveAttribute('data-state', 'warning');

    type('lead-quality-sub-1-0-points', '30');
    await waitFor(() => expect(feedback()).toHaveTextContent('Sub-criteria points add up to the weightage.'));
  });

  it('asks for a threshold only for the follower, recent-post and review checks', async () => {
    const { onSaveDraft } = renderForm();
    const threshold = () => screen.queryByTestId('lead-quality-criterion-0-threshold');
    expect(threshold()).toBeNull();
    // The followers sub-criterion already has one.
    expect(screen.getByTestId('lead-quality-sub-1-0-threshold')).toHaveValue('1000');

    for (const check of ['INSTAGRAM_FOLLOWERS_MIN', 'INSTAGRAM_RECENT_POST_DAYS', 'GOOGLE_REVIEWS_MIN'] as const) {
      pickCheck('lead-quality-criterion-0', check);
      expect(threshold()).toBeInTheDocument();
    }
    expect(screen.getByText('The fewest Google reviews that pass.')).toBeInTheDocument();
    type('lead-quality-criterion-0-threshold', '25');

    for (const check of ['NONE', 'CRM_UNIQUENESS', 'EMAIL_DELIVERABLE', 'INSTAGRAM_BUSINESS_PROFILE', 'GOOGLE_MAPS_LISTING', 'WEBSITE_REACHABLE'] as const) {
      pickCheck('lead-quality-criterion-0', check);
      expect(threshold()).toBeNull();
    }
    // The 25 typed for the reviews check is not sent with a check that takes none.
    fireEvent.click(screen.getByTestId('lead-quality-save'));
    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1));
    expect(onSaveDraft.mock.calls[0][0].input.criteria[0]).toMatchObject({ auto_check: 'WEBSITE_REACHABLE', threshold: null });
  });

  it('refuses a missing threshold for a check that needs one', async () => {
    const { onSaveDraft } = renderForm();
    pickCheck('lead-quality-criterion-0', 'INSTAGRAM_FOLLOWERS_MIN');
    fireEvent.click(screen.getByTestId('lead-quality-save'));
    expect(await screen.findByText('Enter a whole number from 1 to 10000000.')).toBeInTheDocument();
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('offers no check on a criterion that has sub-criteria (the checks go on them)', () => {
    renderForm();
    expect(within(screen.getByTestId('lead-quality-criterion-0')).getAllByRole('combobox', { name: /^Automatic check/ })).toHaveLength(1);
    // Criterion 1 shows only its two sub-criteria's checks.
    expect(within(screen.getByTestId('lead-quality-criterion-1')).getAllByRole('combobox', { name: /^Automatic check/ })).toHaveLength(2);
  });

  it('saves the exact API input: keys kept, new rows keyless, hidden thresholds dropped, gates-only as null', async () => {
    const { onSaveDraft } = renderForm();
    type('lead-quality-criterion-2-weightage', '20');
    fireEvent.click(screen.getByTestId('lead-quality-add-criterion'));
    type('lead-quality-criterion-3-name', '  Google Maps ');
    type('lead-quality-criterion-3-weightage', '10');
    fireEvent.click(screen.getByRole('switch', { name: 'Qualify on gates only' }));
    type('lead-quality-change-note', ' Added maps ');
    fireEvent.click(screen.getByTestId('lead-quality-save'));

    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1));
    const expected = fixtureInput();
    expected.criteria[2].weightage = 20;
    expected.criteria.push({
      name: 'Google Maps',
      weightage: 10,
      enabled: true,
      mandatory: false,
      auto_check: 'NONE',
      threshold: null,
      guidance: '',
      sub_criteria: [],
    });
    expect(onSaveDraft.mock.calls[0][0]).toEqual({
      input: { ...expected, min_qualification_score: null },
      change_note: 'Added maps',
      dirty: true,
    });
  });

  it('refuses to save a draft over 100% and shows why', async () => {
    const { onSaveDraft } = renderForm();
    type('lead-quality-criterion-0-weightage', '25');
    fireEvent.click(screen.getByTestId('lead-quality-save'));
    await waitFor(() => expect(totalMessage()).toHaveTextContent('Weightage cannot exceed 100%.'));
    expect(onSaveDraft).not.toHaveBeenCalled();
  });

  it('refuses to publish until the total is exactly 100%, then publishes the reviewed values', async () => {
    const { onPublish } = renderForm();
    type('lead-quality-criterion-0-weightage', '15');
    await waitFor(() => expect(screen.getByTestId('lead-quality-publish-hint')).toHaveTextContent('1 problem to fix before publishing.'));
    fireEvent.click(screen.getByTestId('lead-quality-publish'));
    expect(await screen.findByTestId('lead-quality-publish-refused')).toHaveTextContent('This version cannot be published yet.');
    expect(onPublish).not.toHaveBeenCalled();

    type('lead-quality-criterion-0-weightage', '20');
    await waitFor(() => expect(screen.getByTestId('lead-quality-publish-hint')).toHaveTextContent('Ready to publish.'));
    fireEvent.click(screen.getByTestId('lead-quality-publish'));
    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1));
    // Back to the loaded values, so the page can publish the stored draft without saving it again.
    expect(onPublish.mock.calls[0][0]).toEqual({ input: fixtureInput(), change_note: 'Tuned weights', dirty: false });
    expect(screen.queryByTestId('lead-quality-publish-refused')).toBeNull();
  });

  it('puts the issues the server refused a save with back on their fields', async () => {
    renderForm({
      serverIssues: [
        { path: 'criteria.0.name', code: 'NAME_TOO_LONG', message: 'Keep names under 80 characters.', amount: 80 },
        { path: 'criteria.1.sub_criteria.0.key', code: 'KEY_DUPLICATE', message: 'The key "followers" is used twice.', amount: null },
        { path: 'bands', code: 'BAND_ZERO_MISSING', message: 'One band must start at 0.', amount: null },
      ],
    });
    expect(await screen.findByText('Keep names under 80 characters.')).toBeInTheDocument();
    expect(screen.getByTestId('lead-quality-criterion-0-name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('lead-quality-sub-1-0-name')).toHaveAttribute('aria-invalid', 'true');
    const alert = screen.getByTestId('lead-quality-server-issues');
    expect(alert).toHaveTextContent('The server refused this configuration.');
    expect(alert).toHaveTextContent('One band must start at 0 so every score has a classification.');
  });

  it('reorders and removes criteria, and a disabled criterion stops counting towards the total', async () => {
    const { onSaveDraft } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Move CRM uniqueness down' }));
    expect(screen.getByTestId('lead-quality-criterion-0-name')).toHaveValue('Instagram');
    fireEvent.click(within(screen.getByTestId('lead-quality-criterion-2')).getByRole('switch', { name: 'Enabled' }));
    await waitFor(() => expect(totalMessage()).toHaveTextContent('Allocate the remaining 30% before publishing.'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Website' }));
    fireEvent.click(screen.getByTestId('lead-quality-save'));

    await waitFor(() => expect(onSaveDraft).toHaveBeenCalledTimes(1));
    const [uniqueness, instagram] = fixtureInput().criteria;
    expect(onSaveDraft.mock.calls[0][0].input.criteria).toEqual([instagram, uniqueness]);
  });

  it('locks every field of a published version shown read-only and offers no save or publish', () => {
    renderForm({ readOnly: true });
    expect(screen.getByTestId('lead-quality-criterion-0-name')).toBeDisabled();
    expect(screen.getByTestId('lead-quality-add-criterion')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete CRM uniqueness' })).toBeDisabled();
    expect(screen.queryByTestId('lead-quality-save')).toBeNull();
    expect(screen.queryByTestId('lead-quality-publish')).toBeNull();
  });
});
