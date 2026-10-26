import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NumberSettingCard from '../NumberSettingCard';

interface RenderArgs {
  value?: number | null;
  loading?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onSave?: (next: number) => Promise<void>;
}

const LABEL = 'Remind Before (Hours)';
const INVALID = 'Enter a whole number between 1 and 48.';

const cardProps = ({ value = 24, loading = false, min = 1, max, step, onSave = vi.fn(async () => undefined) }: RenderArgs) => ({
  title: 'Pod Reminder (Hours Before)',
  description: 'How long before a pod starts everyone who joined it is reminded.',
  label: LABEL,
  helperText: 'Between 1 and 48 hours. Default 24.',
  invalidText: INVALID,
  min,
  max,
  step,
  loading,
  value,
  onSave,
});

const renderCard = (args: RenderArgs = {}) => {
  const props = cardProps(args);
  const view = render(<NumberSettingCard {...props} />);
  return { ...view, props };
};

const input = () => screen.getByRole('spinbutton', { name: LABEL });
const saveButton = () => screen.getByRole('button', { name: /^Sav/ });
const type = (value: string) => fireEvent.change(input(), { target: { value } });

describe('NumberSettingCard / hydration', () => {
  it('starts blank and unsaveable until the saved value arrives, then shows it untouched', () => {
    const { rerender, props } = renderCard({ value: null, loading: true });

    expect(screen.getByRole('heading', { name: 'Pod Reminder (Hours Before)' })).toBeInTheDocument();
    expect(input()).toHaveValue(null);
    expect(saveButton()).toBeDisabled();

    rerender(<NumberSettingCard {...props} loading={false} value={24} />);

    expect(input()).toHaveValue(24);
    expect(input()).toHaveAttribute('min', '1');
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText(INVALID)).not.toBeInTheDocument();
    expect(screen.getByText('Between 1 and 48 hours. Default 24.')).toBeInTheDocument();
  });

  it('keeps Save disabled while the settings are still loading, even with a changed number', () => {
    renderCard({ loading: true });
    type('30');
    expect(saveButton()).toBeDisabled();
  });
});

describe('NumberSettingCard / validation', () => {
  it('refuses a decimal', () => {
    renderCard();
    type('2.5');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(INVALID)).toBeInTheDocument();
  });

  it('refuses a number under the minimum', () => {
    renderCard({ min: 1 });
    type('0');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(INVALID)).toBeInTheDocument();
  });

  it('refuses a number over the maximum but accepts the maximum itself', () => {
    renderCard({ max: 48 });
    expect(input()).toHaveAttribute('max', '48');

    type('49');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(INVALID)).toBeInTheDocument();

    type('48');
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(INVALID)).not.toBeInTheDocument();
  });

  it('has no ceiling when the setting declares no maximum', () => {
    renderCard({ max: undefined });
    type('100000');
    expect(saveButton()).toBeEnabled();
  });

  // A total split equally between two sides must be even: 7 would give one side
  // a counter the other never gets, so the box refuses it rather than saving it.
  it('refuses a number off the declared step, and accepts each multiple within the bounds', () => {
    renderCard({ value: 6, min: 2, max: 20, step: 2 });
    expect(input()).toHaveAttribute('step', '2');

    type('7');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(INVALID)).toBeInTheDocument();

    type('8');
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(INVALID)).not.toBeInTheDocument();

    // The bounds still hold for a multiple of the step.
    type('22');
    expect(saveButton()).toBeDisabled();
    type('0');
    expect(saveButton()).toBeDisabled();

    type('20');
    expect(saveButton()).toBeEnabled();
  });

  it('takes any whole number when the setting declares no step', () => {
    renderCard({ value: 24 });
    expect(input()).not.toHaveAttribute('step');
    type('7');
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(INVALID)).not.toBeInTheDocument();
  });
});

describe('NumberSettingCard / saving', () => {
  it('saves the typed number, shows Saving… while the write is in flight, then settles', async () => {
    let finish: () => void = () => undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderCard({ onSave });

    type('36');
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(36);
    expect(await screen.findByRole('button', { name: /Saving…/ })).toBeDisabled();

    finish();

    await waitFor(() => expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled());
  });

  it('shows the server error under the box, and clears it on the next successful save', async () => {
    const onSave = vi
      .fn<(next: number) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Setting is locked by another admin'))
      .mockResolvedValueOnce(undefined);
    renderCard({ onSave });

    type('30');
    fireEvent.click(saveButton());
    expect(await screen.findByText('Setting is locked by another admin')).toBeInTheDocument();

    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());

    await waitFor(() => expect(screen.queryByText('Setting is locked by another admin')).not.toBeInTheDocument());
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
