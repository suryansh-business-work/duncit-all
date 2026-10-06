import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { FormProvider, useForm } from 'react-hook-form';
import LinkedHostsField from '@/forms/fields/LinkedHostsField';
import { HOST_LEADS } from '@/api/crm.gql';
import { hostLead } from '../fixtures/leads';
import { renderWithApollo } from '../helpers/renderWithApollo';

const HOSTS = [
  hostLead({ id: 'h1', host_name: 'Pune Runners', host_type: 'Community', city: 'Pune', lead_status: 'New' }),
  hostLead({ id: 'h2', host_name: 'Solo Chef', host_type: 'Individual', city: null, lead_status: 'Contacted' }),
];

const hostsMock: MockedResponse = {
  request: { query: HOST_LEADS, variables: { filter: {} } },
  result: { data: { hostLeads: HOSTS } },
};

/** A form whose linked host ids are printed so a test can read what the field wrote. */
function Harness({ initial, label }: Readonly<{ initial?: string[]; label?: string }>) {
  const methods = useForm<{ linked_host_ids?: string[] }>({ defaultValues: initial ? { linked_host_ids: initial } : {} });
  const ids = methods.watch('linked_host_ids');
  return (
    <FormProvider {...methods}>
      <LinkedHostsField name="linked_host_ids" label={label} />
      <output data-testid="ids">{JSON.stringify(ids ?? null)}</output>
    </FormProvider>
  );
}

const ids = () => JSON.parse(screen.getByTestId('ids').textContent ?? 'null') as string[] | null;
const input = () => screen.getByRole('combobox', { name: /Linked Host Leads|Hosts/ });

describe('LinkedHostsField', () => {
  it('starts empty with the default label, a search prompt and a spinner while hosts load', () => {
    renderWithApollo(<Harness />, [hostsMock]);

    expect(input()).toHaveAttribute('placeholder', 'Search host leads…');
    expect(screen.getByText('Optional — link host leads who host events at this venue.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(ids()).toBeNull();
  });

  it('lists each host with its type, city and status, and names it with its city when it has one', async () => {
    renderWithApollo(<Harness label="Hosts" />, [hostsMock]);
    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());

    fireEvent.mouseDown(input());
    const listbox = await screen.findByRole('listbox');

    expect(within(listbox).getByText('Community · Pune · New')).toBeInTheDocument();
    expect(within(listbox).getByText('Individual · Contacted')).toBeInTheDocument();

    // Typing happens in a focused box; an unfocused Autocomplete resets its text.
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '— Pune' } });
    // Only a host with a city carries the " — city" suffix in its name.
    expect(within(screen.getByRole('listbox')).getByRole('option')).toHaveTextContent('Pune Runners');
    fireEvent.change(input(), { target: { value: 'Chef' } });
    expect(within(screen.getByRole('listbox')).getByRole('option')).toHaveTextContent('Solo Chef');
  });

  it('shows saved links as chips and writes picks and removals as host ids', async () => {
    renderWithApollo(<Harness initial={['h1', 'gone']} />, [hostsMock]);

    // The stale id with no matching lead is not shown.
    const chip = await screen.findByRole('button', { name: 'Pune Runners' });
    expect(screen.queryByRole('button', { name: 'gone' })).toBeNull();
    expect(input()).toHaveAttribute('placeholder', 'Add another…');

    fireEvent.mouseDown(input());
    // Already-linked hosts are not offered again.
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).queryByText('Pune Runners')).toBeNull();
    fireEvent.click(within(listbox).getByRole('option', { name: /Solo Chef/ }));
    expect(ids()).toEqual(['h1', 'h2']);

    fireEvent.click(within(chip).getByTestId('CancelIcon'));
    expect(ids()).toEqual(['h2']);
  });
});
