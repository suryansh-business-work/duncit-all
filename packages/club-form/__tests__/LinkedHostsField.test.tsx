import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

import LinkedHostsField from '../src/sections/LinkedHostsField';
import type { ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

/**
 * The linked-hosts picker.
 *
 * The behaviours worth pinning are the two that would silently lose data: it
 * stores ACCOUNT ids (`host_ids` refs User, so a picker that saved the host
 * RECORD id would write ids nothing resolves), and it must not drop a selected
 * id the options list cannot name.
 */
const HOSTS = [
  { id: 'h1', user_id: 'u1', full_name: 'Ananya Iyer' },
  { id: 'h2', user_id: 'u2', full_name: 'Kabir Sethi' },
];

let methods: UseFormReturn<ClubFormValues> | null = null;

function renderField(defaults: Partial<ClubFormValues> = {}) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormHarness
      defaultValues={defaults}
      onMethods={(m) => {
        methods = m;
      }}
    >
      {children}
    </FormHarness>
  );
  return render(<LinkedHostsField />, { wrapper: Wrapper });
}

const input = () => screen.getByLabelText(/Hosts linked to this club/) as HTMLInputElement;

beforeEach(() => {
  methods = null;
  useQueryMock.mockReturnValue({ data: { publicHosts: HOSTS }, loading: false });
});
afterEach(() => useQueryMock.mockReset());

describe('LinkedHostsField', () => {
  it('says empty is a real choice rather than looking unfinished', () => {
    renderField();
    expect(screen.getByText(/lists the hosts of its own pods instead/)).toBeInTheDocument();
    expect(input().value).toBe('');
  });

  it('stores the ACCOUNT id of a picked host, not the host record id', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(input());
    await user.click(await screen.findByText('Ananya Iyer'));

    // u1, never h1 — host_ids refs User.
    expect(methods?.getValues('host_ids')).toEqual(['u1']);
  });

  it('keeps an id the options cannot name instead of dropping it', () => {
    // A host who has since been paused is no longer in publicHosts, so the club
    // still holds an id the list will never label. Losing it here would silently
    // unlink them on the next save.
    renderField({ host_ids: ['u-gone'] });
    expect(screen.getByText('u-gone')).toBeInTheDocument();
    expect(methods?.getValues('host_ids')).toEqual(['u-gone']);
  });

  it('renders a labelled chip for an id the options do name', () => {
    renderField({ host_ids: ['u2'] });
    expect(screen.getByText('Kabir Sethi')).toBeInTheDocument();
  });

  it('shows no options while the query is still loading', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true });
    renderField();
    expect(input()).toBeInTheDocument();
  });
});
