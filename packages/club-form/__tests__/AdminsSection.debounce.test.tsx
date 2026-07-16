import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useQuery: useQueryMock,
}));

// The real MUI Autocomplete resets its (non-memoized) controlled input on every
// render, which would wipe a typed search term before the debounce reads it.
// A minimal controlled stand-in lets the term survive so the debounced query
// path (term truthy) is exercised. renderInput is still invoked for parity.
vi.mock('@mui/material', async (importActual) => {
  const actual = await importActual<typeof import('@mui/material')>();
  function FakeAutocomplete(props: {
    inputValue: string;
    loading: boolean;
    onInputChange: (e: unknown, next: string, reason: string) => void;
    renderInput: (params: { InputProps: { endAdornment: null }; inputProps: Record<string, unknown> }) => ReactNode;
  }) {
    const { inputValue, loading, onInputChange, renderInput } = props;
    return (
      <div>
        {renderInput({ InputProps: { endAdornment: null }, inputProps: {} })}
        <input
          aria-label="fake-search"
          value={inputValue}
          onChange={(e) => onInputChange(e, e.target.value, 'input')}
        />
        {loading ? <span role="progressbar" /> : null}
      </div>
    );
  }
  return { ...actual, Autocomplete: FakeAutocomplete };
});

import AdminsSection from '../src/sections/AdminsSection';
import { ClubFormDataProvider } from '../src/context';
import type { ClubFormData } from '../src/types';
import { FormHarness } from './formHarness';

const data: ClubFormData = {
  config: { showAdmins: true, showVerified: true, showIsActive: true },
  initialAdmins: [],
};
const wrap = ({ children }: { children: ReactNode }) => (
  <FormHarness defaultValues={{ admin_user_ids: [] }}>
    <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
  </FormHarness>
);

const lastSearch = () =>
  (useQueryMock.mock.lastCall?.[1] as { variables?: { filter?: { search?: string } } })?.variables?.filter?.search;

afterEach(() => {
  vi.useRealTimers();
  useQueryMock.mockReset();
});

describe('AdminsSection debounced search (term path)', () => {
  it('queries with the trimmed term only after the 300ms debounce', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: false });
    vi.useFakeTimers();
    render(<AdminsSection />, { wrapper: wrap });
    expect(lastSearch()).toBeUndefined();

    fireEvent.change(screen.getByLabelText('fake-search'), { target: { value: '  alice  ' } });
    // Not yet — the debounce has not elapsed.
    act(() => vi.advanceTimersByTime(200));
    expect(lastSearch()).toBeUndefined();
    // After 300ms the trimmed term drives the query.
    act(() => vi.advanceTimersByTime(150));
    expect(lastSearch()).toBe('alice');
  });
});
