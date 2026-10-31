import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { renderWithProviders } from '../testkit';

vi.mock('../../src/components/DateTimeField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).DateTimeFieldStub,
}));
vi.mock('../../src/components/MediaPickerField', async () => ({
  default: (await import('../mocks/occasions-live.mock')).MediaPickerFieldStub,
}));

import { RhfDateTime, RhfImage, RhfOnOff } from '../../src/pages/occasions-page/rhf-fields';

interface Values {
  from?: string;
  until: string;
  art: string;
  on: boolean;
  quiet: boolean;
}

/** A form holding one of each field, with buttons that fail them the way a resolver would. */
function Harness({ defaults, onValues }: Readonly<{ defaults: Values; onValues: (values: Values) => void }>) {
  const { control, setError, getValues } = useForm<Values>({ defaultValues: defaults });
  return (
    <form>
      <RhfDateTime control={control} name="from" label="From" hint="When it starts" />
      <RhfDateTime control={control} name="until" label="Until" required />
      <RhfImage control={control} name="art" label="Art" hint="A square PNG" folder="/branding/occasions" />
      <RhfOnOff control={control} name="on" label="Switched on" hint="Off pauses it" />
      <RhfOnOff control={control} name="quiet" label="Quiet" />
      <button type="button" onClick={() => setError('from', { message: 'Pick a start' })}>
        fail-from
      </button>
      <button type="button" onClick={() => setError('art', { message: 'Upload an image' })}>
        fail-art
      </button>
      <button type="button" onClick={() => onValues(getValues())}>
        read
      </button>
    </form>
  );
}

const DEFAULTS: Values = { from: undefined, until: '2026-11-05T00:00:00.000Z', art: '', on: true, quiet: false };

describe('Occasions RHF fields', () => {
  it('shows each field’s value, hint and required flag, with a blank for no value', () => {
    renderWithProviders(<Harness defaults={DEFAULTS} onValues={vi.fn()} />);
    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(screen.getByTestId('datetime-help-From')).toHaveTextContent('When it starts');
    expect(screen.getByLabelText('Until')).toHaveValue('2026-11-05T00:00:00.000Z');
    expect(screen.getByLabelText('Until')).toBeRequired();
    // A date field with no hint keeps its line, so the layout does not jump when an error appears.
    expect(screen.getByTestId('datetime-help-Until').textContent).toBe(' ');
    expect(screen.getByTestId('media-Art')).toHaveAttribute('data-folder', '/branding/occasions');
    expect(screen.getByText('A square PNG')).toBeInTheDocument();
    expect(screen.getByLabelText('Switched on')).toBeChecked();
    expect(screen.getByText('Off pauses it')).toBeInTheDocument();
    expect(screen.getByLabelText('Quiet')).not.toBeChecked();
  });

  it('writes what is picked back into the form', () => {
    const onValues = vi.fn();
    renderWithProviders(<Harness defaults={DEFAULTS} onValues={onValues} />);
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-01T00:00:00.000Z' } });
    fireEvent.change(screen.getByLabelText('Art'), { target: { value: 'https://cdn.example.com/a.png' } });
    fireEvent.click(screen.getByLabelText('Switched on'));
    fireEvent.click(screen.getByLabelText('Quiet'));
    fireEvent.click(screen.getByRole('button', { name: 'read' }));
    expect(onValues).toHaveBeenCalledWith({
      from: '2026-11-01T00:00:00.000Z',
      until: '2026-11-05T00:00:00.000Z',
      art: 'https://cdn.example.com/a.png',
      on: false,
      quiet: true,
    });
    expect(screen.getByLabelText('Switched on')).not.toBeChecked();
  });

  it('puts a field’s error in place of its hint', () => {
    renderWithProviders(<Harness defaults={DEFAULTS} onValues={vi.fn()} />);
    expect(screen.queryByText('Upload an image')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fail-from' }));
    expect(screen.getByTestId('datetime-help-From')).toHaveTextContent('Pick a start');
    expect(screen.getByLabelText('From')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Until')).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'fail-art' }));
    expect(screen.getByText('Upload an image')).toBeInTheDocument();
  });
});
