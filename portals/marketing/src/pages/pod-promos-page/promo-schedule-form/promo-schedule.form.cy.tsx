import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTranslation } from '@duncit/app-settings';
import { PromoScheduleForm, blankScheduleValues, promoScheduleSchema, toScheduleVariables } from '.';

const translator = () => renderHook(() => useTranslation()).result.current.t;

const ACCOUNTS = [
  { id: 'acc1', label: 'Duncit (INSTAGRAM)' },
  { id: 'acc2', label: 'Duncit Pages (FACEBOOK)' },
];

const issues = (input: Record<string, unknown>) => {
  const parsed = promoScheduleSchema(translator()).safeParse({ ...blankScheduleValues(null), ...input });
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
};

describe('promoScheduleSchema', () => {
  it('accepts an all-empty form: every field then comes from the settings', () => {
    expect(issues({})).toEqual([]);
  });

  it('accepts a future time and refuses one already past', () => {
    expect(issues({ at: new Date(Date.now() + 3_600_000).toISOString() })).toEqual([]);
    expect(issues({ at: new Date(Date.now() - 3_600_000).toISOString() })).toEqual(['Pick a time in the future, or leave it empty']);
    expect(issues({ at: 'not a date' })).toEqual(['Pick a time in the future, or leave it empty']);
  });

  it('allows a time a few seconds late, inside the minute of grace', () => {
    expect(issues({ at: new Date(Date.now() - 30_000).toISOString() })).toEqual([]);
  });

  it('holds collaborators to the Instagram cap of 3 and to the username shape', () => {
    expect(issues({ collaborators: ['a', 'b', 'c'] })).toEqual([]);
    expect(issues({ collaborators: ['a', 'b', 'c', 'd'] })).toEqual(['Instagram takes at most 3 collaborators on a post']);
    expect(issues({ collaborators: ['run-club'] })).toEqual([
      'Each collaborator must be an Instagram username: letters, digits, _ and single dots, up to 30 characters',
    ]);
  });
});

describe('blankScheduleValues / toScheduleVariables', () => {
  it('starts empty and copies the promotion collaborators rather than sharing them', () => {
    const existing = ['blue.cafe'];
    const values = blankScheduleValues(existing);
    expect(values).toEqual({ at: '', account_ids: [], collaborators: ['blue.cafe'] });
    expect(values.collaborators).not.toBe(existing);
    expect(blankScheduleValues(null).collaborators).toEqual([]);
  });

  it('turns empty fields into nulls so the server fills them from the settings', () => {
    expect(toScheduleVariables(blankScheduleValues(null), 'pod1', null, false)).toEqual({
      pod_id: 'pod1',
      at: null,
      account_ids: null,
      collaborators: null,
      style: null,
    });
  });

  it('sends what was chosen, an empty collaborator list included when it was a choice', () => {
    const values = { at: '2026-11-03T12:30:00.000Z', account_ids: ['acc1'], collaborators: [] };
    expect(toScheduleVariables(values, 'pod1', 'SPORT_NIGHT', true)).toEqual({
      pod_id: 'pod1',
      at: '2026-11-03T12:30:00.000Z',
      account_ids: ['acc1'],
      collaborators: [],
      style: 'SPORT_NIGHT',
    });
  });
});

const renderForm = (collaborators: string[] | null = null, busy = false) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <PromoScheduleForm accounts={ACCOUNTS} collaborators={collaborators} timeZone="Asia/Kolkata" busy={busy} onSubmit={onSubmit} />
    </LocalizationProvider>,
  );
  return onSubmit;
};

const typeHandle = (handle: string) => {
  const input = within(screen.getByTestId('promo-schedule-collaborators')).getByRole('combobox');
  fireEvent.change(input, { target: { value: handle } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('PromoScheduleForm', () => {
  it('says what an empty field means, in the admin time zone', () => {
    renderForm();
    expect(screen.getByText('Leave empty to post at the time the settings give (Asia/Kolkata).')).toBeInTheDocument();
    expect(screen.getByText('Leave empty to post to the accounts in the settings.')).toBeInTheDocument();
    expect(screen.getByText(/Leave empty to invite the venue and the host/)).toBeInTheDocument();
  });

  it('submits untouched collaborators as the server’s choice', async () => {
    const onSubmit = renderForm();
    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ at: '', account_ids: [], collaborators: [] });
    expect(onSubmit.mock.calls[0][1]).toBe(false);
  });

  it('cleans a typed handle, picks an account and submits both as choices', async () => {
    const onSubmit = renderForm();
    typeHandle('@Blue.Cafe ');
    expect(await screen.findByText('blue.cafe')).toBeInTheDocument();
    const accounts = within(screen.getByTestId('promo-schedule-accounts')).getByRole('combobox');
    fireEvent.mouseDown(accounts);
    fireEvent.click(await screen.findByRole('option', { name: 'Duncit (INSTAGRAM)' }));
    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ account_ids: ['acc1'], collaborators: ['blue.cafe'] });
    expect(onSubmit.mock.calls[0][1]).toBe(true);
  });

  it('refuses a fourth collaborator and a handle Instagram would not take', async () => {
    const onSubmit = renderForm(['a.one', 'b_two', 'c3']);
    expect(screen.getByText('Instagram only. Up to 3 accounts are invited as collaborators; each accepts the invite in Instagram before the post shows on their profile.')).toBeInTheDocument();
    typeHandle('d4');
    expect(await screen.findByText('Instagram takes at most 3 collaborators on a post')).toBeInTheDocument();
    expect(screen.getByTestId('form-actions-row-submit')).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends prefilled collaborators even when nobody edited them', async () => {
    const onSubmit = renderForm(['blue.cafe']);
    await waitFor(() => expect(screen.getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(screen.getByTestId('form-actions-row-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].collaborators).toEqual(['blue.cafe']);
    expect(onSubmit.mock.calls[0][1]).toBe(true);
  });

  it('locks its fields while a schedule is in flight', () => {
    renderForm(null, true);
    expect(within(screen.getByTestId('promo-schedule-collaborators')).getByRole('combobox')).toBeDisabled();
    expect(within(screen.getByTestId('promo-schedule-accounts')).getByRole('combobox')).toBeDisabled();
  });
});
