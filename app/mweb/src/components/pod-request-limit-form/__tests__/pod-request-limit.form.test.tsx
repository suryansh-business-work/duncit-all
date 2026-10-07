import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PodRequestLimitForm, type PodRequestLimitFormProps } from '..';
import { interpolatedCopy } from '../../../pages/pod-requests/__tests__/interpolatedCopy';

const LABEL = 'Maximum Host Requests / Month';
const INVALID = 'Enter a whole number from 0 to 100.';

function renderForm(over: Partial<PodRequestLimitFormProps> = {}) {
  const onSubmit = vi.fn(async () => undefined);
  const props: PodRequestLimitFormProps = {
    label: LABEL,
    initialLimit: 10,
    override: null,
    saving: false,
    error: null,
    onSubmit,
    testId: 'limit',
    ...over,
  };
  const view = render(<PodRequestLimitForm {...props} />);
  return { ...view, onSubmit, props };
}

const input = () => screen.getByLabelText(LABEL);
const typeAndSave = (value: string) => {
  fireEvent.change(input(), { target: { value } });
  fireEvent.click(screen.getByTestId('limit-save'));
};

describe('PodRequestLimitForm', () => {
  it('starts from the saved cap with its hint and no override note', () => {
    renderForm();

    expect(input()).toHaveValue(10);
    expect(screen.getByText('How many Pod Requests you can send each month (0-100).')).toBeInTheDocument();
    expect(screen.queryByTestId('limit-override')).not.toBeInTheDocument();
  });

  it('saves the typed cap as a whole number', async () => {
    const { onSubmit } = renderForm();

    typeAndSave('25');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(25));
  });

  it.each([
    ['0', 0],
    ['100', 100],
  ])('accepts the boundary %s', async (value, expected) => {
    const { onSubmit } = renderForm();

    typeAndSave(value);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expected));
  });

  it.each([
    ['blank', ''],
    ['over 100', '101'],
    ['negative', '-1'],
    ['a fraction', '2.5'],
  ])('refuses a %s cap without saving', async (_case, value) => {
    const { onSubmit } = renderForm();

    typeAndSave(value);

    expect(await screen.findByText(INVALID)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("notes Duncit's override, which wins over the partner's own cap", () => {
    renderForm({ override: 3 });

    expect(screen.getByTestId('limit-override')).toHaveTextContent(interpolatedCopy('Set by Duncit:', 3, 'per month.'));
  });

  it('shows an override of 0 too (a partner Duncit has stopped)', () => {
    renderForm({ override: 0 });

    expect(screen.getByTestId('limit-override')).toBeInTheDocument();
  });

  it("shows the server's error under the box", () => {
    renderForm({ error: 'You cannot change this right now.' });

    expect(screen.getByText('You cannot change this right now.')).toBeInTheDocument();
  });

  it('takes the new saved cap when it changes from outside (a refetch, another venue)', async () => {
    const { rerender, props } = renderForm();
    fireEvent.change(input(), { target: { value: '42' } });

    rerender(<PodRequestLimitForm {...props} initialLimit={7} />);

    await waitFor(() => expect(input()).toHaveValue(7));
  });
});
