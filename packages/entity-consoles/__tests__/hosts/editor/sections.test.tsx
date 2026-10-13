import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { Control } from 'react-hook-form';
import { renderForm } from '../../../src/venues/editor/__tests__/harness';
import StatusSection from '../../../src/hosts/editor/sections/StatusSection';
import VerificationSection from '../../../src/hosts/editor/sections/VerificationSection';
import CategoriesSection from '../../../src/hosts/editor/sections/CategoriesSection';
import { blankHostCategory, blankHostValues, type HostFormValues } from '../../../src/hosts/editor/types';

// The real category cascade reads the whole category tree over GraphQL; what
// this section owns is the ROW list around it, so each row is a plain input that
// writes the row's `sub_name`.
vi.mock('@duncit/category', async (importOriginal) => {
  const { Controller } = await import('react-hook-form');
  return {
    ...(await importOriginal<object>()),
    RhfAdminCategory: ({
      control,
      name,
    }: {
      control: Control<HostFormValues>;
      name: `categories.${number}`;
    }) => (
      <Controller
        control={control}
        name={`${name}.sub_name`}
        render={({ field }) => (
          <input aria-label={`row ${name}`} value={field.value} onChange={field.onChange} />
        )}
      />
    ),
  };
});

describe('Host StatusSection', () => {
  const renderStatus = (canGovern: boolean, over: Partial<HostFormValues> = {}) =>
    renderForm<HostFormValues>(
      { ...blankHostValues, ...over },
      ({ control }) => <StatusSection control={control} canGovern={canGovern} />,
    );

  it('lets a governing admin set the commission and the monthly Pod Request limit', () => {
    const { form } = renderStatus(true);
    const commission = screen.getByRole('spinbutton', { name: /Commission/ });
    const limit = screen.getByRole('spinbutton', { name: /Maximum Venue Requests/ });
    expect(commission).toBeEnabled();
    expect(limit).toBeEnabled();

    fireEvent.change(commission, { target: { value: '12' } });
    fireEvent.change(limit, { target: { value: '4' } });
    expect(form().getValues('host_commission_pct')).toBe('12');
    expect(form().getValues('venue_requests_limit_override')).toBe('4');
  });

  it('shows a console-role editor the commission and limit but will not let them move it', () => {
    renderStatus(false, { host_commission_pct: 15, venue_requests_limit_override: '6' });
    const commission = screen.getByRole('spinbutton', { name: /Commission/ });
    expect(commission).toBeDisabled();
    expect(commission).toHaveValue(15);
    expect(screen.getByRole('spinbutton', { name: /Maximum Venue Requests/ })).toBeDisabled();
  });

  it('carries the payout fields under the same section', () => {
    const { form } = renderStatus(true);
    fireEvent.change(screen.getByRole('textbox', { name: /Account holder/i }), {
      target: { value: 'Ananya Iyer' },
    });
    expect(form().getValues('bank_account.account_holder_name')).toBe('Ananya Iyer');
  });
});

describe('Host VerificationSection', () => {
  const renderVerification = (onPick: (folder?: string) => Promise<string | null>) =>
    renderForm<HostFormValues>(blankHostValues, ({ control }) => (
      <VerificationSection control={control} onPick={onPick} />
    ));

  it('records the identity numbers as typed', () => {
    const { form } = renderVerification(vi.fn());
    fireEvent.change(screen.getByRole('textbox', { name: /Aadhaar number/ }), {
      target: { value: '123412341234' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /PAN number/ }), {
      target: { value: 'ABCDE1234F' },
    });
    expect(form().getValues('aadhar_number')).toBe('123412341234');
    expect(form().getValues('pan_number')).toBe('ABCDE1234F');
  });

  it('uploads the passport photo and the police document into their own folders', async () => {
    const onPick = vi
      .fn<(folder?: string) => Promise<string | null>>()
      .mockResolvedValueOnce('https://cdn.example.test/photo.jpg')
      .mockResolvedValueOnce('https://cdn.example.test/police.pdf');
    const { form } = renderVerification(onPick);

    const uploads = screen.getAllByRole('button', { name: /Upload/ });
    expect(uploads).toHaveLength(2);
    fireEvent.click(uploads[0]);
    await waitFor(() =>
      expect(form().getValues('passport_photo_url')).toBe('https://cdn.example.test/photo.jpg'),
    );
    fireEvent.click(uploads[1]);
    await waitFor(() =>
      expect(form().getValues('police_verification_url')).toBe('https://cdn.example.test/police.pdf'),
    );
    expect(onPick.mock.calls).toEqual([['/hosts'], ['/host-documents']]);
  });

  it('keeps the stored URL when the picker is dismissed', async () => {
    const onPick = vi.fn().mockResolvedValue(null);
    const { form } = renderForm<HostFormValues>(
      { ...blankHostValues, passport_photo_url: 'https://cdn.example.test/kept.jpg' },
      ({ control }) => <VerificationSection control={control} onPick={onPick} />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Upload/ })[0]);
    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
    expect(form().getValues('passport_photo_url')).toBe('https://cdn.example.test/kept.jpg');
  });
});

describe('Host CategoriesSection', () => {
  const row = blankHostCategory;
  const renderCategories = (categories: HostFormValues['categories']) =>
    renderForm<HostFormValues>({ ...blankHostValues, categories }, ({ control }) => (
      <CategoriesSection control={control} />
    ));

  it('starts with only the add action when the host runs nothing yet', () => {
    renderCategories([]);
    expect(screen.queryByLabelText(/^row categories/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a category' })).toBeInTheDocument();
  });

  it('appends a blank triple for each Add', () => {
    const { form } = renderCategories([]);
    fireEvent.click(screen.getByRole('button', { name: 'Add a category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a category' }));
    expect(form().getValues('categories')).toHaveLength(2);
    expect(form().getValues('categories.1.sub_id')).toBe('');
  });

  it('withdraws exactly the row removed, keeping the others in order', () => {
    const { form } = renderCategories([
      { ...row, sub_name: 'Chess' },
      { ...row, sub_name: 'Poker' },
      { ...row, sub_name: 'Carrom' },
    ]);
    const removes = screen.getAllByRole('button', { name: 'Remove this category' });
    expect(removes).toHaveLength(3);

    fireEvent.click(removes[1]);
    expect(form().getValues('categories').map((c) => c.sub_name)).toEqual(['Chess', 'Carrom']);
  });
});
