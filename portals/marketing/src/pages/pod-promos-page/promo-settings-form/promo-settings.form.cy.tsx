import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { useTranslation } from '@duncit/app-settings';
import { PromoSettingsForm, promoSettingsSchema, toFormValues, type PromoSettingsOptions } from '.';
import type { PodPromoSettings } from '../queries';

const translator = () => renderHook(() => useTranslation()).result.current.t;

const settings: PodPromoSettings = {
  enabled: true,
  days_before: 3,
  post_hour: 18,
  account_ids: ['acc1'],
  needs_approval: true,
  city_ids: ['gone-city'],
  club_ids: [],
  category_ids: [],
  price_filter: 'ALL',
  min_days_until_start: 1,
  banner_style: 'PORTRAIT',
  cta_text: '',
  utm_prefix: 'pod-promo',
  time_zone: 'Asia/Kolkata',
  updated_by_name: 'Asha',
  updated_at: null,
};

const options: PromoSettingsOptions = {
  accounts: [
    { id: 'acc1', label: 'Duncit (INSTAGRAM)' },
    { id: 'acc2', label: 'Duncit Pages (FACEBOOK)' },
  ],
  cities: [{ id: 'loc1', label: 'Pune' }],
  clubs: [{ id: 'club1', label: 'Pune Runners' }],
  categories: [{ id: 'cat1', label: 'Fitness' }],
};

const issues = (input: Record<string, unknown>) => {
  const parsed = promoSettingsSchema(translator()).safeParse({ ...toFormValues(settings), ...input });
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
};

describe('promoSettingsSchema', () => {
  it('accepts the saved settings and leaves out the read-only fields', () => {
    const values = toFormValues(settings);
    expect(values).not.toHaveProperty('time_zone');
    expect(values).not.toHaveProperty('updated_by_name');
    expect(values.account_ids).not.toBe(settings.account_ids);
    expect(issues({})).toEqual([]);
  });

  it('holds days, hour and lead time to their ranges, and to whole numbers', () => {
    expect(issues({ days_before: 0 })).toEqual(['Enter a number from 1 to 30.']);
    expect(issues({ days_before: 31 })).toEqual(['Enter a number from 1 to 30.']);
    expect(issues({ post_hour: 24 })).toEqual(['Enter a number from 0 to 23.']);
    expect(issues({ min_days_until_start: -1 })).toEqual(['Enter a number from 0 to 30.']);
    expect(issues({ days_before: 2.5 })).toEqual(['Enter a whole number.']);
    expect(issues({ days_before: 30, post_hour: 0, min_days_until_start: 30 })).toEqual([]);
  });

  it('keeps the call to action to 40 characters and the prefix slug-shaped', () => {
    expect(issues({ cta_text: 'x'.repeat(41) })).toEqual(['Keep it under 40 characters.']);
    expect(issues({ cta_text: 'x'.repeat(40) })).toEqual([]);
    expect(issues({ utm_prefix: '' })).toContain('Enter a campaign prefix.');
    expect(issues({ utm_prefix: 'Pod Promo' })).toEqual(['Use lowercase letters, digits and single dashes.']);
    expect(issues({ utm_prefix: 'pod--promo' })).toEqual(['Use lowercase letters, digits and single dashes.']);
    expect(issues({ utm_prefix: 'x'.repeat(31) })).toEqual(['Keep it under 30 characters.']);
    expect(issues({ utm_prefix: 'diwali-2026' })).toEqual([]);
  });

  it('refuses switching on with no account to post to, but allows it while off', () => {
    expect(issues({ account_ids: [] })).toEqual(['Pick at least one account before switching promotions on.']);
    expect(issues({ account_ids: [], enabled: false })).toEqual([]);
  });
});

describe('PromoSettingsForm', () => {
  it('saves an edit and keeps a picked id the options no longer hold', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PromoSettingsForm settings={settings} options={options} readOnly={false} busy={false} onSubmit={onSubmit} />);
    const save = screen.getByRole('button', { name: 'Save settings' });
    expect(save).toBeDisabled();
    // A city since deleted still shows, by its id.
    expect(within(screen.getByTestId('promo-cities')).getByText('gone-city')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Days before the pod/), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('promo-needs-approval').querySelector('input') as HTMLInputElement);
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ days_before: 5, needs_approval: false, city_ids: ['gone-city'], account_ids: ['acc1'] });
  });

  it('adds and removes accounts through the picker', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PromoSettingsForm settings={settings} options={options} readOnly={false} busy={false} onSubmit={onSubmit} />);
    const accounts = within(screen.getByTestId('promo-accounts')).getByRole('combobox');
    fireEvent.mouseDown(accounts);
    fireEvent.click(await screen.findByRole('option', { name: 'Duncit Pages (FACEBOOK)' }));
    expect(within(screen.getByTestId('promo-accounts')).getByText('Duncit Pages (FACEBOOK)')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save settings' });
    // The button turns on once the async validation has answered.
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].account_ids).toEqual(['acc1', 'acc2']);
  });

  it('shows the error under the picker when the last account is removed while on', async () => {
    render(<PromoSettingsForm settings={settings} options={options} readOnly={false} busy={false} onSubmit={vi.fn()} />);
    const picker = screen.getByTestId('promo-accounts');
    fireEvent.click(within(picker).getByTestId('CancelIcon'));
    expect(await within(picker).findByText('Pick at least one account before switching promotions on.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  });

  it('shows the time zone the hour is read in, and is read-only without a save button for an editor', () => {
    render(<PromoSettingsForm settings={settings} options={options} readOnly busy={false} onSubmit={vi.fn()} />);
    expect(screen.getByText('Hour of the day, in Asia/Kolkata.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Days before the pod/)).toBeDisabled();
    expect(screen.getByTestId('promo-enabled').querySelector('input')).toBeDisabled();
  });
});
