import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useQuery: useQueryMock,
}));

import LinksSection from '../src/sections/LinksSection';
import { ClubFormDataProvider } from '../src/context';
import type { ClubFormConfig, ClubFormData, ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

function renderLinks(config: ClubFormConfig, defaults: Partial<ClubFormValues> = {}) {
  const data: ClubFormData = { config, initialAdmins: [] };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormHarness defaultValues={defaults}>
      <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
    </FormHarness>
  );
  return render(<LinksSection />, { wrapper: Wrapper });
}

const withAdmins: ClubFormConfig = { showAdmins: true, showVerified: true, showIsActive: true };

beforeEach(() => {
  useQueryMock.mockReturnValue({ data: undefined, loading: false, error: undefined });
});
afterEach(() => useQueryMock.mockReset());

describe('LinksSection', () => {
  it('always renders the WhatsApp link fields', () => {
    renderLinks({ showAdmins: false, showVerified: false, showIsActive: false });
    expect(screen.getByLabelText(/WhatsApp Community link/)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp Group link/)).toBeInTheDocument();
    // No admin panel when governance is off — the venues query never runs.
    expect(screen.queryByText('Auto-matched venues')).not.toBeInTheDocument();
    expect(useQueryMock).not.toHaveBeenCalled();
  });

  it('prompts to pick a location before any venue lookup (skip)', () => {
    renderLinks(withAdmins, { location_id: '' });
    expect(screen.getByText('Auto-matched venues')).toBeInTheDocument();
    expect(screen.getByText(/Pick a/)).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });

  it('shows a spinner while matching venues load', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined });
    renderLinks(withAdmins, { location_id: 'L1', locality: '', super_category_id: '', category_id: '' });
    expect(screen.getByText('Finding matching venues…')).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        skip: false,
        variables: { location_id: 'L1', locality: null, super_category_id: null, category_id: null },
      }),
    );
  });

  it('surfaces a query error', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false, error: { message: 'boom' } });
    renderLinks(withAdmins, { location_id: 'L1' });
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('warns when no venues match (default-coloured zero chip)', () => {
    useQueryMock.mockReturnValue({ data: { matchingVenues: [] }, loading: false, error: undefined });
    renderLinks(withAdmins, { location_id: 'L1' });
    expect(screen.getByText(/No approved venues match/)).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('lists matched venues and passes category/locality variables', () => {
    useQueryMock.mockReturnValue({
      data: {
        matchingVenues: [
          { id: 'v1', venue_name: 'Studio One', locality: 'Andheri', city: 'Mumbai', state: 'MH' },
          { id: 'v2', venue_name: 'Nameless', locality: '', city: '', state: '' },
        ],
      },
      loading: false,
      error: undefined,
    });
    renderLinks(withAdmins, { location_id: 'L1', locality: 'Andheri', super_category_id: 'S1', category_id: 'C1' });

    expect(screen.getByText('Studio One')).toBeInTheDocument();
    expect(screen.getByText('Andheri, Mumbai, MH')).toBeInTheDocument();
    expect(screen.getByText('Nameless')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(useQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { location_id: 'L1', locality: 'Andheri', super_category_id: 'S1', category_id: 'C1' },
      }),
    );
  });
});
