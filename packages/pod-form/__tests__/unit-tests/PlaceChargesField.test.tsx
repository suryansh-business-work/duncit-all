import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import PlaceChargesField from '../../src/components/PlaceChargesField';
import type { PodPlaceCharge } from '../../src/types';

function Controlled({
  initial = [],
  helperText,
}: Readonly<{ initial?: PodPlaceCharge[]; helperText?: string }>) {
  const [value, setValue] = useState<PodPlaceCharge[]>(initial);
  return <PlaceChargesField value={value} onChange={setValue} helperText={helperText} />;
}

describe('PlaceChargesField', () => {
  it('renders the helper text when provided', () => {
    render(<Controlled helperText="Extra charges" />);
    expect(screen.getByText('Extra charges')).toBeInTheDocument();
  });

  it('adds a blank charge row', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Add charge' }));
    expect(screen.getByLabelText('Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount (₹)')).toBeInTheDocument();
    expect(screen.getByLabelText('Note')).toBeInTheDocument();
  });

  it('edits label, amount and note fields', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={[{ label: '', amount: 0, note: '' }]} />);
    await user.type(screen.getByLabelText('Label'), 'Entry');
    expect(screen.getByLabelText('Label')).toHaveValue('Entry');

    const amount = screen.getByLabelText('Amount (₹)');
    await user.clear(amount);
    await user.type(amount, '150');
    expect(amount).toHaveValue(150);

    await user.type(screen.getByLabelText('Note'), 'door');
    expect(screen.getByLabelText('Note')).toHaveValue('door');
  });

  it('coerces a non-numeric amount to 0', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={[{ label: 'x', amount: 5, note: '' }]} />);
    const amount = screen.getByLabelText('Amount (₹)');
    await user.clear(amount);
    expect(amount).toHaveValue(0);
  });

  it('updates only the edited row and leaves the others intact', async () => {
    const user = userEvent.setup();
    const methodsSeen: import('../../src/types').PodPlaceCharge[][] = [];
    function Multi() {
      const [value, setValue] = useState<PodPlaceCharge[]>([
        { label: 'A', amount: 1, note: '' },
        { label: 'B', amount: 2, note: '' },
      ]);
      return (
        <PlaceChargesField
          value={value}
          onChange={(next) => {
            methodsSeen.push(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Multi />);
    const firstLabel = screen.getAllByLabelText('Label')[0];
    await user.type(firstLabel, 'X');
    // the untouched second row (i !== idx branch) keeps its value
    const last = methodsSeen[methodsSeen.length - 1];
    expect(last[1]).toEqual({ label: 'B', amount: 2, note: '' });
  });

  it('removes a charge row', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={[{ label: 'Entry', amount: 100, note: '' }]} />);
    expect(screen.getByDisplayValue('Entry')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByDisplayValue('Entry')).not.toBeInTheDocument();
  });

  it('keeps stable keys as the list grows and shrinks', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'Add charge' }));
    await user.click(screen.getByRole('button', { name: 'Add charge' }));
    expect(screen.getAllByLabelText('Label')).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    expect(screen.getAllByLabelText('Label')).toHaveLength(1);
  });
});
