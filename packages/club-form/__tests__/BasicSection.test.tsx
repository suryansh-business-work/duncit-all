import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

vi.mock('@duncit/category', () => import('./mocks/categoryMock'));
vi.mock('@duncit/location', () => import('./mocks/locationMock'));

import BasicSection from '../src/sections/BasicSection';
import { ClubFormDataProvider } from '../src/context';
import type { ClubFormConfig, ClubFormData, ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

function renderBasic(opts: {
  config: ClubFormConfig;
  defaults?: Partial<ClubFormValues>;
  onMethods?: (m: UseFormReturn<ClubFormValues>) => void;
}) {
  const data: ClubFormData = { config: opts.config, initialAdmins: [] };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormHarness defaultValues={opts.defaults} onMethods={opts.onMethods}>
      <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
    </FormHarness>
  );
  return render(<BasicSection />, { wrapper: Wrapper });
}

const fullConfig: ClubFormConfig = { showAdmins: true, showVerified: true, showIsActive: true };

describe('BasicSection', () => {
  it('create mode: shows the auto-slug hint, verified switch, and no active switch', async () => {
    const user = userEvent.setup();
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderBasic({ config: fullConfig, defaults: {}, onMethods: (m) => { methods = m; } });

    expect(screen.getByText('A URL-friendly slug is auto-generated from this name')).toBeInTheDocument();
    expect(screen.getByText('Not verified')).toBeInTheDocument();
    // showIsActive is on but there is no club id yet, so no Active switch.
    expect(screen.queryByText('Active')).not.toBeInTheDocument();

    await user.click(screen.getByText('Not verified').closest('div')!.querySelector('input')!);
    expect(methods?.getValues('is_verified')).toBe(true);
    expect(screen.getByText('Verified club')).toBeInTheDocument();
  });

  it('pushes category and location picker changes into the form', async () => {
    const user = userEvent.setup();
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderBasic({ config: fullConfig, defaults: {}, onMethods: (m) => { methods = m; } });

    await user.click(screen.getByRole('button', { name: 'pick-category' }));
    expect(methods?.getValues('super_category_id')).toBe('S9');
    expect(methods?.getValues('category_id')).toBe('SUB9');

    await user.click(screen.getByRole('button', { name: 'pick-location' }));
    expect(methods?.getValues('location_id')).toBe('L9');
    expect(methods?.getValues('locality')).toBe('Bandra');
  });

  it('edit mode: shows the persisted slug and a working active toggle', async () => {
    const user = userEvent.setup();
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderBasic({
      config: { showAdmins: true, showVerified: false, showIsActive: true },
      defaults: { id: 'club-1', club_id: 'my-slug', is_active: true },
      onMethods: (m) => { methods = m; },
    });

    expect(screen.getByText('URL slug: my-slug')).toBeInTheDocument();
    expect(screen.queryByText('Not verified')).not.toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    await user.click(screen.getByText('Active').closest('div')!.querySelector('input')!);
    expect(methods?.getValues('is_active')).toBe(false);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('edit mode with a blank slug shows the em-dash placeholder', () => {
    renderBasic({ config: fullConfig, defaults: { id: 'club-1', club_id: '' } });
    expect(screen.getByText('URL slug: —')).toBeInTheDocument();
  });

  it('forwards validation errors to the category and location pickers', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    renderBasic({ config: fullConfig, defaults: {}, onMethods: (m) => { methods = m; } });
    act(() => {
      methods?.setError('super_category_id', { message: 'Select a super category' });
      methods?.setError('category_id', { message: 'Select a sub category' });
      methods?.setError('location_id', { message: 'Select the club location' });
    });
    expect(screen.getByTestId('cat-super-err')).toHaveTextContent('Select a super category');
    expect(screen.getByTestId('cat-sub-err')).toHaveTextContent('Select a sub category');
    expect(screen.getByTestId('loc-city-err')).toHaveTextContent('Select the club location');
  });
});
