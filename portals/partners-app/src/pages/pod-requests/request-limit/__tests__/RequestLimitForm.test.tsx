import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor } from '@testing-library/react';
import { RequestLimitForm } from '..';
import { renderWithProviders } from '../../../../__tests__/render';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const LABEL = 'Maximum Venue Requests / Month';
const INVALID = 'Enter a whole number from 0 to 100.';

const mount = (over: { limit?: number; override?: number | null; saving?: boolean; error?: string | null } = {}) => {
  const onSave = vi.fn(async () => undefined);
  renderWithProviders(
    <RequestLimitForm
      label={LABEL}
      limit={over.limit ?? 10}
      override={over.override}
      saving={over.saving ?? false}
      error={over.error ?? null}
      onSave={onSave}
    />,
  );
  return { onSave };
};

const field = () => screen.getByLabelText(LABEL) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('RequestLimitForm', () => {
  it("starts from the partner's saved cap with the range hint and no override notice", () => {
    mount({ limit: 12 });

    expect(field().value).toBe('12');
    expect(screen.getByText('How many Pod Requests you can send each month (0-100).')).toBeTruthy();
    expect(screen.queryByText(/Set by Duncit/)).toBeNull();
  });

  it("says when Duncit's override is the number that counts — zero included", () => {
    mount({ override: 0 });
    expect(screen.getByText('Set by Duncit: 0 per month.')).toBeTruthy();
  });

  it('saves the typed number as a number', async () => {
    const { onSave } = mount();

    fireEvent.change(field(), { target: { value: '25' } });
    save();

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(25));
  });

  it.each([
    ['0', 0],
    ['100', 100],
  ])('accepts the boundary %s', async (typed, expected) => {
    const { onSave } = mount();

    fireEvent.change(field(), { target: { value: typed } });
    save();

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expected));
  });

  it.each(['', '101', '-1', '2.5'])('refuses %j without saving', async (typed) => {
    const { onSave } = mount();

    fireEvent.change(field(), { target: { value: typed } });
    save();

    expect(await screen.findByText(INVALID)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows the server's error and locks Save while saving", () => {
    mount({ error: 'Not your venue', saving: true });

    expect(screen.getByText('Not your venue')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
