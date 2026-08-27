/**
 * MUI's Slider only ever hands a scalar to onChange for a scalar `value`, so the
 * range-array payload the handler guards against cannot be produced through the
 * real control. The Slider alone is swapped for a stub that emits one, and the
 * real SpotsStepper is asserted to take the FIRST thumb.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpotsStepper } from '../src/spots';

interface StubSliderProps {
  onChange: (event: unknown, value: number | number[]) => void;
}

vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material')>();
  const Slider = ({ onChange }: Readonly<StubSliderProps>) => (
    <button type="button" onClick={(event) => onChange(event, [7, 9])}>
      range
    </button>
  );
  return { ...actual, Slider };
});

describe('SpotsStepper — range payload', () => {
  it('takes the first thumb when the slider reports an array', async () => {
    const onChange = vi.fn();
    render(
      <SpotsStepper
        value={12}
        onChange={onChange}
        labels={{
          totalSpots: 'Total spots',
          hint: 'hint',
          fixedHint: 'fixed',
          increase: 'up',
          decrease: 'down',
        }}
        slidable
        min={4}
        max={20}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'range' }));
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
