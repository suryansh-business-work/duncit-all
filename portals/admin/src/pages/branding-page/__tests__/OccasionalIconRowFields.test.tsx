import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextField } from '@mui/material';
import { FALLBACK_ICON_NAMES } from '@duncit/fallback-icons';
import { parseLocalDateTimeInput, toLocalDateTimeInput } from '@duncit/datetime';
import OccasionalIconRowFields, { toLocalInput } from '../OccasionalIconRowFields';
import type { OccasionalIconRow } from '../queries';
import { MockedProvider } from '@apollo/client/testing';
import { DuncitLocalizationProvider } from '@duncit/app-settings';

/** The real field mounts the shared ImageKit/Pexels dialog (its own queries and
 * uploads). This row only cares that picking a URL patches `icon_url`. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: (
    props: Readonly<{ label: string; value: string; onChange: (url: string) => void }>,
  ) => (
    <button type="button" aria-label={props.label} onClick={() => props.onChange(PICKED_URL)}>
      {props.value || 'no icon'}
    </button>
  ),
}));

/** The real field is a MUI X DateTimePicker (a Date in, a Date out); it is
 * stubbed as the plain `datetime-local` box it replaced (LocalDateTimeField's
 * own doc comment: the value shape is unchanged) so a row's window can still
 * be exercised with a typed local string. */
vi.mock('@mui/x-date-pickers/DateTimePicker', () => ({
  DateTimePicker: ({
    label,
    value,
    onChange,
    slotProps,
  }: Readonly<{
    label: string;
    value: Date | null;
    onChange: (value: Date | null) => void;
    slotProps?: { textField?: { fullWidth?: boolean; error?: boolean; helperText?: string } };
  }>) => (
    <TextField
      label={label}
      type="datetime-local"
      value={value ? toLocalDateTimeInput(value) : ''}
      onChange={(e) => onChange(parseLocalDateTimeInput(e.target.value))}
      fullWidth={slotProps?.textField?.fullWidth}
      error={slotProps?.textField?.error}
      helperText={slotProps?.textField?.helperText}
    />
  ),
}));

const PICKED_URL = 'https://cdn.test/branding/occasions/diya.png';
const BUNDLED = ['diwali', 'new-year', 'christmas', 'holi'];

const makeRow = (over: Partial<OccasionalIconRow> = {}): OccasionalIconRow => ({
  slug: 'diwali',
  label: 'Diwali',
  starts_at: '2026-11-01T18:30:00.000Z',
  ends_at: '2026-11-05T18:30:00.000Z',
  icon_url: '',
  fallback_icon: 'occasion',
  is_active: true,
  sort_order: 2,
  ...over,
});

const renderRow = (over: Partial<OccasionalIconRow> = {}, index = 3) => {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  render(
    <MockedProvider mocks={[]}>
      <DuncitLocalizationProvider>
        <OccasionalIconRowFields
          row={makeRow(over)}
          index={index}
          bundledSlugs={BUNDLED}
          onChange={onChange}
          onRemove={onRemove}
        />
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );
  return { onChange, onRemove };
};

describe('toLocalInput', () => {
  it('returns an empty string for missing instants', () => {
    expect(toLocalInput('')).toBe('');
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput(undefined)).toBe('');
  });

  it('returns an empty string for an unparseable instant', () => {
    expect(toLocalInput('not-a-date')).toBe('');
  });

  it('formats an instant as the local datetime-local shape, zero padded', () => {
    // Built in local time so the expectation holds in any timezone.
    const local = new Date(2026, 0, 5, 7, 9, 30).toISOString();
    expect(toLocalInput(local)).toBe('2026-01-05T07:09');
  });

  it('leaves already two-digit parts untouched', () => {
    const local = new Date(2026, 10, 25, 21, 45).toISOString();
    expect(toLocalInput(local)).toBe('2026-11-25T21:45');
  });
});

describe('OccasionalIconRowFields — slug', () => {
  it('tells the admin the slug matches bundled app art, ignoring case and spaces', () => {
    renderRow({ slug: '  Diwali ' });
    expect(
      screen.getByText('Matches a bundled app icon — used offline, no network needed.'),
    ).toBeInTheDocument();
  });

  it('warns that an unbundled slug will be loaded over the network', () => {
    renderRow({ slug: 'eid' });
    expect(
      screen.getByText('No bundled app icon for this slug; the app will load the URL below.'),
    ).toBeInTheDocument();
  });

  it('flags a blank slug as invalid', () => {
    renderRow({ slug: '   ' });
    expect(screen.getByLabelText('Slug')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not flag a filled slug', () => {
    renderRow({ slug: 'holi' });
    expect(screen.getByLabelText('Slug')).toHaveAttribute('aria-invalid', 'false');
  });

  it('patches the slug for its own row index', () => {
    const { onChange } = renderRow({}, 4);
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'holi' } });
    expect(onChange).toHaveBeenCalledWith(4, { slug: 'holi' });
  });

  it('patches the admin-only label', () => {
    const { onChange } = renderRow({}, 0);
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Deepavali' } });
    expect(onChange).toHaveBeenCalledWith(0, { label: 'Deepavali' });
  });
});

describe('OccasionalIconRowFields — window', () => {
  it('shows the stored instants in the local datetime-local inputs', () => {
    const starts = new Date(2026, 2, 14, 6, 0).toISOString();
    const ends = new Date(2026, 2, 15, 23, 30).toISOString();
    renderRow({ starts_at: starts, ends_at: ends });
    expect(screen.getByLabelText('Starts at')).toHaveValue('2026-03-14T06:00');
    expect(screen.getByLabelText('Ends at')).toHaveValue('2026-03-15T23:30');
  });

  it('patches starts_at and ends_at with the raw local value typed', () => {
    const { onChange } = renderRow({}, 1);
    fireEvent.change(screen.getByLabelText('Starts at'), {
      target: { value: '2026-11-08T09:00' },
    });
    fireEvent.change(screen.getByLabelText('Ends at'), { target: { value: '2026-11-09T10:00' } });
    expect(onChange).toHaveBeenNthCalledWith(1, 1, { starts_at: '2026-11-08T09:00' });
    expect(onChange).toHaveBeenNthCalledWith(2, 1, { ends_at: '2026-11-09T10:00' });
  });

  it('warns the row will be dropped when it ends before it starts', () => {
    renderRow({ starts_at: '2026-11-05T00:00:00.000Z', ends_at: '2026-11-01T00:00:00.000Z' });
    expect(
      screen.getByText('Ends before it starts — this row will be dropped.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ends at')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not warn while the window is still half filled', () => {
    renderRow({ starts_at: '2026-11-05T00:00:00.000Z', ends_at: '' });
    expect(
      screen.queryByText('Ends before it starts — this row will be dropped.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ends at')).toHaveAttribute('aria-invalid', 'false');
  });

  it('does not warn for a well-ordered window', () => {
    renderRow();
    expect(screen.getByLabelText('Ends at')).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('OccasionalIconRowFields — icon', () => {
  it('patches icon_url with the URL the picker returns', () => {
    const { onChange } = renderRow({}, 2);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Icon (used by mWeb, portals and any app without bundled art)',
      }),
    );
    expect(onChange).toHaveBeenCalledWith(2, { icon_url: PICKED_URL });
  });

  it('falls the fallback-icon select back to "occasion" when nothing is stored', () => {
    renderRow({ fallback_icon: '' });
    expect(screen.getByRole('combobox')).toHaveTextContent('occasion');
  });

  it('offers every name in the fallback-icon contract', () => {
    renderRow();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      ...FALLBACK_ICON_NAMES,
    ]);
  });

  it('patches fallback_icon with the picked name', () => {
    const { onChange } = renderRow({}, 5);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'logo' }));
    expect(onChange).toHaveBeenCalledWith(5, { fallback_icon: 'logo' });
  });
});

describe('OccasionalIconRowFields — activation, priority and removal', () => {
  it('reads Active and pauses the row when switched off', () => {
    const { onChange } = renderRow({ is_active: true }, 0);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(0, { is_active: false });
  });

  it('reads Paused and reactivates the row when switched on', () => {
    const { onChange } = renderRow({ is_active: false }, 0);
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(0, { is_active: true });
  });

  it('patches the priority as a number', () => {
    const { onChange } = renderRow({ sort_order: 2 }, 7);
    expect(screen.getByLabelText('Priority')).toHaveValue(2);
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith(7, { sort_order: 9 });
  });

  it('falls a cleared priority back to 0 rather than NaN', () => {
    const { onChange } = renderRow({}, 7);
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(7, { sort_order: 0 });
  });

  it('removes its own row index', () => {
    const { onRemove } = renderRow({}, 6);
    fireEvent.click(screen.getByRole('button', { name: 'Remove occasion' }));
    expect(onRemove).toHaveBeenCalledWith(6);
  });
});
