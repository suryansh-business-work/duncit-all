import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RequestLimitForm from './request-limit.form';

const LABEL = 'Maximum Host Requests / Month';
const HINT = 'Leave empty to use the default of 10 per month.';
const INVALID = 'Enter a whole number from 0 to 1000, or leave it empty.';

const input = () => screen.getByTestId('limit-input');
const save = () => screen.getByTestId('limit-save');

/** Types into the box and waits for the (async) validation to settle. */
async function type(value: string) {
  fireEvent.change(input(), { target: { value } });
  await waitFor(() => expect(input()).toHaveValue(value === '' ? null : Number(value)));
}

function renderForm(limit: number | null | undefined, onSave = vi.fn().mockResolvedValue(undefined)) {
  const view = render(<RequestLimitForm label={LABEL} limit={limit} saving={false} onSave={onSave} testId="limit" />);
  return { ...view, onSave };
}

describe('RequestLimitForm', () => {
  it('shows the stored admin limit under its label, and offers Save only once it moves', async () => {
    renderForm(25);
    expect(screen.getByLabelText(LABEL)).toHaveValue(25);
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(save()).toBeDisabled();

    await type('30');
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it('starts empty when no admin limit was set, and saves a typed one as a number', async () => {
    const { onSave } = renderForm(null);
    expect(input()).toHaveValue(null);

    await type('25');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(25));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
    expect(save()).toBeDisabled();
  });

  it('saves an emptied box as null, handing the partner back to the default of 10', async () => {
    const { onSave } = renderForm(40);
    await type('');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
  });

  it('keeps 0 as a real limit rather than "not set"', async () => {
    const { onSave } = renderForm(undefined);
    await type('0');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(0));
  });

  it.each(['1001', '-1', '2.5'])('refuses %s with the one shared message, without saving', async (bad) => {
    const { onSave } = renderForm(5);
    await type(bad);
    expect(await screen.findByText(INVALID)).toBeInTheDocument();
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
    fireEvent.click(save());
    await waitFor(() => expect(screen.getByText(INVALID)).toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves on Enter without submitting a form around it, and ignores other keys', async () => {
    const outerSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <form onSubmit={outerSubmit}>
        <RequestLimitForm label={LABEL} limit={3} saving={false} onSave={onSave} testId="limit" />
      </form>,
    );
    await type('12');
    fireEvent.keyDown(input(), { key: 'a' });
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.keyDown(input(), { key: 'Enter' });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(12));
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it('shows the server refusal and keeps the typed value for a retry', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Not allowed'));
    renderForm(8, onSave);
    await type('9');
    await waitFor(() => expect(save()).toBeEnabled());
    fireEvent.click(save());

    expect(await screen.findByTestId('limit-error')).toHaveTextContent('Not allowed');
    expect(input()).toHaveValue(9);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reseeds when another record (or a refreshed value) comes in', () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <RequestLimitForm label={LABEL} limit={4} saving={false} onSave={onSave} testId="limit" />,
    );
    rerender(<RequestLimitForm label={LABEL} limit={null} saving={false} onSave={onSave} testId="limit" />);
    expect(input()).toHaveValue(null);
    rerender(<RequestLimitForm label={LABEL} limit={70} saving={false} onSave={onSave} testId="limit" />);
    expect(input()).toHaveValue(70);
  });
});
