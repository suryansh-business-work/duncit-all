import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { COMMS_PROVIDER_OPTIONS, type CommsProviderOption } from '@/api/comms.gql';
import CommsProviderSelect from '@/components/CommsProviderSelect';

const optionsMock = (type: 'SMTP' | 'TWILIO_CALL', options: CommsProviderOption[]): MockedResponse => ({
  request: { query: COMMS_PROVIDER_OPTIONS, variables: { type } },
  result: { data: { commsProviderOptions: options.map((o) => ({ __typename: 'CommsProviderOption', ...o })) } },
});

const providers: CommsProviderOption[] = [
  { id: 'p1', name: 'Primary SMTP', is_default: false },
  { id: 'p2', name: 'Backup SMTP', is_default: true },
];

const combobox = () => screen.getByRole('combobox');

describe('CommsProviderSelect', () => {
  it('is disabled while loading and shows the empty hint when no provider is active', async () => {
    renderWithApollo(
      <CommsProviderSelect type="SMTP" value="" onChange={vi.fn()} />,
      [optionsMock('SMTP', [])],
    );
    expect(combobox()).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByText(/no active providers/i)).toBeInTheDocument();
    expect(combobox()).toHaveAttribute('aria-disabled', 'true');
  });

  it('selects the default provider when nothing is chosen', async () => {
    const onChange = vi.fn();
    renderWithApollo(<CommsProviderSelect type="SMTP" value="" onChange={onChange} />, [optionsMock('SMTP', providers)]);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('p2'));
  });

  it('falls back to the first provider when none is marked default', async () => {
    const onChange = vi.fn();
    renderWithApollo(
      <CommsProviderSelect type="SMTP" value="" onChange={onChange} />,
      [optionsMock('SMTP', [{ id: 'a', name: 'A', is_default: false }, { id: 'b', name: 'B', is_default: false }])],
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('a'));
  });

  it('replaces a selection that is no longer active with the default', async () => {
    const onChange = vi.fn();
    renderWithApollo(
      <CommsProviderSelect type="SMTP" value="gone" onChange={onChange} />,
      [optionsMock('SMTP', providers)],
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('p2'));
  });

  it('keeps a valid selection untouched', async () => {
    const onChange = vi.fn();
    renderWithApollo(<CommsProviderSelect type="SMTP" value="p1" onChange={onChange} />, [optionsMock('SMTP', providers)]);
    await waitFor(() => expect(combobox()).not.toHaveAttribute('aria-disabled', 'true'));
    expect(combobox()).toHaveTextContent('Primary SMTP');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lists the providers, marks the default and reports a pick', async () => {
    function Harness() {
      const [value, setValue] = useState('p1');
      return <CommsProviderSelect type="TWILIO_CALL" value={value} onChange={setValue} label="Call provider" />;
    }
    renderWithApollo(<Harness />, [optionsMock('TWILIO_CALL', providers)]);
    await waitFor(() => expect(combobox()).not.toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByLabelText('Call provider')).toBeInTheDocument();
    fireEvent.mouseDown(combobox());
    const list = within(screen.getByRole('listbox'));
    expect(list.getByRole('option', { name: 'Backup SMTP · default' })).toBeInTheDocument();
    expect(list.getByRole('option', { name: 'Primary SMTP' })).toBeInTheDocument();
    fireEvent.click(list.getByRole('option', { name: 'Backup SMTP · default' }));
    await waitFor(() => expect(combobox()).toHaveTextContent('Backup SMTP'));
  });
});
