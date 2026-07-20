import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdRequestForm from '../src/AdRequestForm';
import type { AdRequestFormValues } from '../src/ad-request.types';
import { makeAdRequestFormValues } from './factories';

// Mock the MUIX DatePicker so no LocalizationProvider is required and both the
// date-selected and date-cleared onChange branches can be driven directly.
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: Record<string, any>) => (
    <div>
      <span data-testid="date-value">{props.value ? props.value.toISOString() : 'null'}</span>
      <span data-testid="date-helper">{props.slotProps?.textField?.helperText}</span>
      <span data-testid="date-error">{String(props.slotProps?.textField?.error)}</span>
      <button onClick={() => props.onChange(new Date('2026-09-01T00:00:00.000Z'))}>set-date</button>
      <button onClick={() => props.onChange(null)}>clear-date</button>
    </div>
  ),
}));

// Probe for the media field: exposes the props the Controller passes and lets us
// fire its onChange.
vi.mock('../src/AdMediaField', () => ({
  default: (props: Record<string, any>) => (
    <div data-testid="media-field">
      <span data-testid="media-type">{props.adType}</span>
      <span data-testid="media-value">{props.value}</span>
      <button onClick={() => props.onChange('picked-media-url')}>pick-media</button>
    </div>
  ),
}));

const validValues = (): AdRequestFormValues => makeAdRequestFormValues();

interface Overrides {
  initialValues?: AdRequestFormValues;
  busy?: boolean;
  errorMessage?: string | null;
  onSubmit?: (v: AdRequestFormValues) => void;
  onValuesChange?: (v: AdRequestFormValues) => void;
}

const renderForm = (overrides: Overrides = {}) => {
  const onSubmit = overrides.onSubmit ?? vi.fn();
  const onValuesChange = overrides.onValuesChange ?? vi.fn();
  const utils = render(
    <AdRequestForm
      initialValues={overrides.initialValues ?? validValues()}
      busy={overrides.busy ?? false}
      errorMessage={overrides.errorMessage ?? null}
      onValuesChange={onValuesChange}
      onSubmit={onSubmit}
    />,
  );
  return { ...utils, onSubmit, onValuesChange };
};

describe('AdRequestForm', () => {
  it('renders the fields with the seeded values and a default date helper', () => {
    renderForm();
    expect(screen.getByLabelText(/ad title/i)).toHaveValue('Weekend Mega Sale');
    expect(screen.getByTestId('media-type')).toHaveTextContent('IMAGE');
    expect(screen.getByText(/Ad Duration: 7 days/)).toBeInTheDocument();
    expect(screen.getByTestId('date-helper')).toHaveTextContent('Today or later');
    expect(screen.getByTestId('date-error')).toHaveTextContent('false');
  });

  it('publishes value changes to onValuesChange as the user types', async () => {
    const onValuesChange = vi.fn();
    renderForm({ onValuesChange });
    fireEvent.change(screen.getByLabelText(/ad title/i), { target: { value: 'New Title' } });
    await waitFor(() => expect(onValuesChange).toHaveBeenCalled());
    const last = onValuesChange.mock.calls.at(-1)?.[0];
    expect(last.ad_title).toBe('New Title');
  });

  it('clears the uploaded media when the ad type changes', async () => {
    renderForm();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /ad type/i }));
    const listbox = within(screen.getByRole('listbox'));
    fireEvent.click(listbox.getByText('Video'));
    await waitFor(() => expect(screen.getByTestId('media-type')).toHaveTextContent('VIDEO'));
    expect(screen.getByTestId('media-value')).toHaveTextContent('');
  });

  it('accepts a picked media url through the media field', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'pick-media' }));
    await waitFor(() => expect(screen.getByTestId('media-value')).toHaveTextContent('picked-media-url'));
  });

  it('updates the start date, then flags an error when cleared', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'set-date' }));
    await waitFor(() => expect(screen.getByTestId('date-value')).toHaveTextContent('2026-09-01T00:00:00.000Z'));
    fireEvent.click(screen.getByRole('button', { name: 'clear-date' }));
    await waitFor(() => expect(screen.getByTestId('date-error')).toHaveTextContent('true'));
    expect(screen.getByTestId('date-helper')).toHaveTextContent(/required/i);
  });

  it('adjusts the duration via the slider and pluralises the label', async () => {
    const { container } = renderForm();
    const input = container.querySelector('.MuiSlider-root input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '8' } });
    await waitFor(() => expect(screen.getByText(/Ad Duration: 8 days/)).toBeInTheDocument());
  });

  it('renders a singular duration label for a one-day campaign', () => {
    renderForm({ initialValues: { ...validValues(), duration_days: 1 } });
    expect(screen.getByText(/Ad Duration: 1 day\b/)).toBeInTheDocument();
  });

  it('shows the error alert and disables submit while busy', () => {
    renderForm({ errorMessage: 'Something went wrong', busy: true });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit ad request/i })).toBeDisabled();
  });

  it('submits valid values through onSubmit', async () => {
    const onSubmit = vi.fn();
    const { container } = renderForm({ onSubmit });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].ad_title).toBe('Weekend Mega Sale');
  });
});
