import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HostReviewCommission from './HostReviewCommission';

const field = () => screen.getByLabelText('Host commission percentage');

/** Blur (or Enter) fires an async save; flush it so `savedRef` has settled
 * before the next assertion. */
const settle = async (fire: () => void) => {
  await act(async () => {
    fire();
  });
};

const renderField = (props?: Partial<Parameters<typeof HostReviewCommission>[0]>) => {
  const onSave = vi.fn().mockResolvedValue(true);
  render(
    <HostReviewCommission value={0} defaultPct={12} saving={false} onSave={onSave} {...props} />,
  );
  return onSave;
};

describe('HostReviewCommission', () => {
  it('seeds from the finance default when the host has no override', () => {
    renderField();
    expect(field()).toHaveValue(12);
    expect(
      screen.getByText('Finance default is 12%. Set 0 to always follow it.'),
    ).toBeInTheDocument();
  });

  it("seeds from the host's own override when there is one", () => {
    renderField({ value: 18 });
    expect(field()).toHaveValue(18);
  });

  // Writing the default back as a per-host override would silently pin this
  // host to today's number, so an untouched field must save nothing.
  it('saves nothing when the field is blurred untouched', async () => {
    const onSave = renderField();
    await settle(() => fireEvent.blur(field()));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the edited value on blur', async () => {
    const onSave = renderField();
    fireEvent.change(field(), { target: { value: '20' } });
    await settle(() => fireEvent.blur(field()));
    expect(onSave).toHaveBeenCalledWith(20);
  });

  it('saves on Enter without waiting for a click elsewhere', async () => {
    const onSave = renderField();
    fireEvent.change(field(), { target: { value: '7' } });
    await settle(() => fireEvent.keyDown(field(), { key: 'Enter' }));
    expect(onSave).toHaveBeenCalledWith(7);
  });

  it('ignores other keys', async () => {
    const onSave = renderField();
    fireEvent.change(field(), { target: { value: '7' } });
    await settle(() => fireEvent.keyDown(field(), { key: 'a' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not re-save the same value twice', async () => {
    const onSave = renderField();
    fireEvent.change(field(), { target: { value: '20' } });
    await settle(() => fireEvent.blur(field()));
    expect(onSave).toHaveBeenCalledTimes(1);

    await settle(() => fireEvent.blur(field()));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  // A failed save must stay retryable — the value the reviewer typed is still
  // the value that is not in the database.
  it('retries the same value after a failed save', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<HostReviewCommission value={0} defaultPct={12} saving={false} onSave={onSave} />);
    fireEvent.change(field(), { target: { value: '20' } });
    await settle(() => fireEvent.blur(field()));
    expect(onSave).toHaveBeenCalledTimes(1);

    await settle(() => fireEvent.blur(field()));
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['', 'a blank field'],
    ['101', 'above 100'],
    ['-1', 'below 0'],
  ])('refuses to save %s (%s)', async (value) => {
    const onSave = renderField();
    fireEvent.change(field(), { target: { value } });
    await settle(() => fireEvent.blur(field()));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a number between 0 and 100.')).toBeInTheDocument();
  });

  it('disables the field and shows a saving hint while the write is in flight', () => {
    renderField({ saving: true });
    expect(field()).toBeDisabled();
    expect(screen.getByTestId('commission-saving')).toBeInTheDocument();
  });
});
