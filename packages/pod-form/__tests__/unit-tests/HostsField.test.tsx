import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import HostsField from '../../src/components/HostsField';
import { PodFormDataProvider } from '../../src/context';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues, PodHostOption } from '../../src/types';

const HOSTS: PodHostOption[] = [
  { user_id: 'u1', full_name: 'Jo Host', email: 'jo@x.com' },
  { user_id: 'u2', full_name: 'Amy Host', email: 'amy@x.com' },
];

describe('HostsField', () => {
  it('searches on mount, lists options and selects a host', async () => {
    const user = userEvent.setup();
    const searchHosts = vi.fn().mockResolvedValue(HOSTS);
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }), searchHosts })} methodsRef={methodsRef}>
        <HostsField />
      </Harness>,
    );
    await waitFor(() => expect(searchHosts).toHaveBeenCalledWith(''));
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Jo Host'));
    expect(methodsRef.current?.getValues('pod_hosts_id')).toEqual(['u1']);
  });

  it('shows the required hint by default', () => {
    const searchHosts = vi.fn().mockResolvedValue([]);
    render(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }), searchHosts })}>
        <HostsField />
      </Harness>,
    );
    expect(screen.getByText('Search approved hosts by name or email.')).toBeInTheDocument();
  });

  it('shows the optional hint when hosts are not required', () => {
    const searchHosts = vi.fn().mockResolvedValue([]);
    render(
      <Harness
        data={makeData({ config: makeConfig({ showHosts: true, requireHosts: false }), searchHosts })}
      >
        <HostsField />
      </Harness>,
    );
    expect(screen.getByText('Optional — leave empty to be the host yourself.')).toBeInTheDocument();
  });

  it('runs the debounce timer and re-searches when searchHosts changes', async () => {
    const first = vi.fn().mockResolvedValue(HOSTS);
    const second = vi.fn().mockResolvedValue(HOSTS);
    const { rerender } = render(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }), searchHosts: first })}>
        <HostsField />
      </Harness>,
    );
    await waitFor(() => expect(first).toHaveBeenCalledWith(''));
    // let the 300ms debounce timer fire (covers the setTerm callback)
    await new Promise((resolve) => {
      setTimeout(resolve, 350);
    });
    rerender(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }), searchHosts: second })}>
        <HostsField />
      </Harness>,
    );
    await waitFor(() => expect(second).toHaveBeenCalledWith(''));
  });

  it('renders a chip for a preselected host and shows the validation error', () => {
    const searchHosts = vi.fn().mockResolvedValue(HOSTS);
    const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
    render(
      <Harness
        data={makeData({ config: makeConfig({ showHosts: true }), users: HOSTS, searchHosts })}
        defaultValues={{ pod_hosts_id: ['u1', 'unknown-id'] }}
        methodsRef={methodsRef}
      >
        <HostsField />
      </Harness>,
    );
    // labelled chip from users + an id-only chip for the unknown id
    expect(screen.getByText('Jo Host')).toBeInTheDocument();
    expect(screen.getByText('unknown-id')).toBeInTheDocument();
    act(() => {
      methodsRef.current?.setError('pod_hosts_id', { type: 'custom', message: 'Add at least one host' });
    });
    expect(screen.getByText('Add at least one host')).toBeInTheDocument();
  });

  it('swallows a rejected search without crashing', async () => {
    const searchHosts = vi.fn().mockRejectedValue(new Error('nope'));
    render(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }), searchHosts })}>
        <HostsField />
      </Harness>,
    );
    await waitFor(() => expect(searchHosts).toHaveBeenCalled());
    // still renders the input after the rejection
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('does not search when no searchHosts is injected', () => {
    render(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }) })}>
        <HostsField />
      </Harness>,
    );
    // renders without fetching; the loading spinner is absent
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders an em dash for options without a full name', async () => {
    const user = userEvent.setup();
    const searchHosts = vi.fn().mockResolvedValue([{ user_id: 'u9', email: 'noname@x.com' }]);
    render(
      <Harness data={makeData({ config: makeConfig({ showHosts: true }), searchHosts })}>
        <HostsField />
      </Harness>,
    );
    await waitFor(() => expect(searchHosts).toHaveBeenCalled());
    await user.click(screen.getByRole('combobox'));
    // renderOption uses '—' when full_name is missing
    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('defaults host ids to an empty list when the field has no value', () => {
    const searchHosts = vi.fn().mockResolvedValue([]);
    render(<NoDefaultHosts searchHosts={searchHosts} />);
    // useWatch returns undefined -> `?? []` keeps the picker usable
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

function NoDefaultHosts({ searchHosts }: Readonly<{ searchHosts: () => Promise<PodHostOption[]> }>) {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <PodFormDataProvider value={makeData({ config: makeConfig({ showHosts: true }), searchHosts })}>
        <HostsField />
      </PodFormDataProvider>
    </FormProvider>
  );
}
