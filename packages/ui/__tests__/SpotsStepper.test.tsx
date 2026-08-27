import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpotsStepper } from '../src/spots';
import type { SpotsStepperLabels } from '../src/spots';

const LABELS: SpotsStepperLabels = {
  totalSpots: 'Total spots',
  hint: 'How many people can join',
  fixedHint: 'This space seats a fixed number',
  increase: 'Increase spots',
  decrease: 'Decrease spots',
};

describe('SpotsStepper — plain stepper', () => {
  it('renders the heading, the default hint and both step buttons', () => {
    render(<SpotsStepper value={12} onChange={vi.fn()} labels={LABELS} />);
    expect(screen.getByText('Total spots')).toBeInTheDocument();
    expect(screen.getByText('How many people can join')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase spots' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Decrease spots' })).toBeEnabled();
    expect(screen.getByRole('spinbutton', { name: 'Total spots' })).toHaveValue(12);
  });

  it('steps up and down within the bounds', async () => {
    const onChange = vi.fn();
    render(<SpotsStepper value={5} onChange={onChange} labels={LABELS} min={2} max={8} />);
    await userEvent.click(screen.getByRole('button', { name: 'Increase spots' }));
    expect(onChange).toHaveBeenCalledWith(6);
    await userEvent.click(screen.getByRole('button', { name: 'Decrease spots' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables the step buttons at the floor and the ceiling', () => {
    const { unmount } = render(
      <SpotsStepper value={2} onChange={vi.fn()} labels={LABELS} min={2} max={8} />,
    );
    expect(screen.getByRole('button', { name: 'Decrease spots' })).toBeDisabled();
    unmount();
    render(<SpotsStepper value={8} onChange={vi.fn()} labels={LABELS} min={2} max={8} />);
    expect(screen.getByRole('button', { name: 'Increase spots' })).toBeDisabled();
  });

  it('clamps a typed value to the ceiling and turns a cleared field into the floor', () => {
    const onChange = vi.fn();
    render(<SpotsStepper value={5} onChange={onChange} labels={LABELS} min={2} max={8} />);
    const input = screen.getByRole('spinbutton', { name: 'Total spots' });
    fireEvent.change(input, { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith(8);
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('prefers a boundsHint over the default hint', () => {
    render(
      <SpotsStepper value={5} onChange={vi.fn()} labels={LABELS} boundsHint="Min 4, up to 20" />,
    );
    expect(screen.getByText('Min 4, up to 20')).toBeInTheDocument();
    expect(screen.queryByText('How many people can join')).not.toBeInTheDocument();
  });

  it('renders read-only with the fixed hint and no step controls', () => {
    render(<SpotsStepper value={6} onChange={vi.fn()} labels={LABELS} readOnly />);
    expect(screen.getByText('This space seats a fixed number')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Increase spots' })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('shows the error under the stepper', () => {
    render(<SpotsStepper value={5} onChange={vi.fn()} labels={LABELS} error="Too few spots" />);
    expect(screen.getByText('Too few spots')).toHaveClass('Mui-error');
  });
});

describe('SpotsStepper — slider', () => {
  it('renders the value, the min/max marks and the bounds hint', () => {
    render(
      <SpotsStepper
        value={12}
        onChange={vi.fn()}
        labels={LABELS}
        slidable
        min={4}
        max={20}
        boundsHint="Category minimum 4 · venue capacity 20"
      />,
    );
    expect(screen.getByTestId('spots-value')).toHaveTextContent('12');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByTestId('spots-bounds-hint')).toHaveTextContent(
      'Category minimum 4 · venue capacity 20',
    );
  });

  it('reports a dragged value through onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SpotsStepper value={12} onChange={onChange} labels={LABELS} slidable min={4} max={20} />,
    );
    const slider = container.querySelector('input[type="range"]');
    expect(slider).not.toBeNull();
    fireEvent.change(slider as HTMLInputElement, { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('shows the error and omits the hint when neither is given', () => {
    const { rerender } = render(
      <SpotsStepper value={12} onChange={vi.fn()} labels={LABELS} slidable min={4} max={20} />,
    );
    expect(screen.queryByTestId('spots-bounds-hint')).not.toBeInTheDocument();
    rerender(
      <SpotsStepper
        value={12}
        onChange={vi.fn()}
        labels={LABELS}
        slidable
        min={4}
        max={20}
        error="Out of range"
      />,
    );
    expect(screen.getByText('Out of range')).toHaveClass('Mui-error');
  });
});
