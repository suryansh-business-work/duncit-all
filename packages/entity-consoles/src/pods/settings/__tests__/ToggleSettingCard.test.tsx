import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ToggleSettingCard from '../ToggleSettingCard';

const TITLE = 'OTP Verification Before Marking Attendance';
const ON_HINT = 'On — the host verifies the attendee’s number first.';
const OFF_HINT = 'Off — the host can mark an attendee present without a code.';

interface RenderArgs {
  value?: boolean | null;
  loading?: boolean;
  onSave?: (next: boolean) => Promise<void>;
}

const renderCard = ({ value = true, loading = false, onSave = vi.fn(async () => undefined) }: RenderArgs = {}) =>
  render(
    <ToggleSettingCard
      title={TITLE}
      description="A host marking attendance by hand must verify the attendee first."
      onHint={ON_HINT}
      offHint={OFF_HINT}
      loading={loading}
      value={value}
      onSave={onSave}
    />,
  );

const toggle = () => screen.getByRole('switch', { name: TITLE });

describe('ToggleSettingCard / states', () => {
  it('shows a spinner instead of a switch until the saved value has loaded', () => {
    renderCard({ value: null, loading: true });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(OFF_HINT)).toBeInTheDocument();
  });

  it('renders the saved on state with its hint', () => {
    renderCard({ value: true });

    expect(toggle()).toBeChecked();
    expect(toggle()).toBeEnabled();
    expect(screen.getByText(ON_HINT)).toBeInTheDocument();
    expect(screen.queryByText(OFF_HINT)).not.toBeInTheDocument();
  });

  it('keeps the known value visible but locked while a refetch is loading', () => {
    renderCard({ value: false, loading: true });

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(toggle()).not.toBeChecked();
    expect(toggle()).toBeDisabled();
  });
});

describe('ToggleSettingCard / flipping', () => {
  it('saves the flipped value and locks the switch until the write settles', async () => {
    let finish: () => void = () => undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderCard({ value: true, onSave });

    fireEvent.click(toggle());

    expect(onSave).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toggle()).toBeDisabled());

    finish();

    await waitFor(() => expect(toggle()).toBeEnabled());
  });

  it('shows the server error when the write fails', async () => {
    renderCard({ value: false, onSave: vi.fn(async () => Promise.reject(new Error('Not allowed to change this'))) });

    fireEvent.click(toggle());

    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed to change this');
    expect(toggle()).toBeEnabled();
  });

  it('unlocks the switch without an error line when the write rejects with no error object', async () => {
    // A transport that rejects with nothing at all, not an Error.
    const onSave = vi.fn(() => Promise.reject(undefined));
    renderCard({ value: false, onSave });

    fireEvent.click(toggle());

    expect(onSave).toHaveBeenCalledWith(true);
    expect(toggle()).toBeDisabled();
    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
