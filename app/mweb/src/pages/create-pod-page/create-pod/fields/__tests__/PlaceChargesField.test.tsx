import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import PlaceChargesField from '../PlaceChargesField';
import type { PodPlaceCharge } from '../../create-pod.types';

/** The field is controlled; this holds the list the way the form does, and
 * exposes the latest value so the assertions read what the form would submit. */
function Harness({ initial, onValue }: Readonly<{ initial: PodPlaceCharge[]; onValue: (v: PodPlaceCharge[]) => void }>) {
  const [value, setValue] = useState(initial);
  return (
    <PlaceChargesField
      value={value}
      helperText="Shown to guests separately"
      onChange={(next) => {
        setValue(next);
        onValue(next);
      }}
    />
  );
}

const inputOf = (testId: string) => screen.getByTestId(testId) as HTMLInputElement;

describe('PlaceChargesField', () => {
  it('shows the helper text and an add button when there are no charges', () => {
    render(<Harness initial={[]} onValue={vi.fn()} />);
    expect(screen.getByText('Shown to guests separately')).toBeInTheDocument();
    expect(screen.queryByTestId('charge-label-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('charge-add')).toBeInTheDocument();
  });

  it('appends a blank charge, then edits label, amount and note', () => {
    const onValue = vi.fn();
    render(<Harness initial={[]} onValue={onValue} />);
    fireEvent.click(screen.getByTestId('charge-add'));
    expect(onValue).toHaveBeenLastCalledWith([{ label: '', amount: 0, note: '' }]);

    fireEvent.change(inputOf('charge-label-0-input'), { target: { value: 'Table fee' } });
    fireEvent.change(inputOf('charge-amount-0-input'), { target: { value: '250' } });
    fireEvent.change(inputOf('charge-note-0-input'), { target: { value: 'Per table' } });
    expect(onValue).toHaveBeenLastCalledWith([{ label: 'Table fee', amount: 250, note: 'Per table' }]);
  });

  it('treats a cleared or non-numeric amount as zero rather than NaN', () => {
    const onValue = vi.fn();
    render(<Harness initial={[{ label: 'Entry', amount: 100, note: '' }]} onValue={onValue} />);
    fireEvent.change(inputOf('charge-amount-0-input'), { target: { value: '' } });
    expect(onValue).toHaveBeenLastCalledWith([{ label: 'Entry', amount: 0, note: '' }]);
  });

  it('removes the right row from the middle and keeps the others as they were', () => {
    const onValue = vi.fn();
    render(
      <Harness
        initial={[
          { label: 'A', amount: 1, note: '' },
          { label: 'B', amount: 2, note: '' },
          { label: 'C', amount: 3, note: '' },
        ]}
        onValue={onValue}
      />,
    );
    fireEvent.click(screen.getByTestId('charge-remove-1'));
    expect(onValue).toHaveBeenLastCalledWith([
      { label: 'A', amount: 1, note: '' },
      { label: 'C', amount: 3, note: '' },
    ]);
    expect(inputOf('charge-label-0-input')).toHaveValue('A');
    expect(inputOf('charge-label-1-input')).toHaveValue('C');
    expect(screen.queryByTestId('charge-label-2')).not.toBeInTheDocument();
  });
});
