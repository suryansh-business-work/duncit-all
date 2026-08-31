import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TextField } from '@mui/material';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { parseLocalDateTimeInput, toLocalDateTimeInput } from '@duncit/datetime';
import OccasionalIconsSection from '../OccasionalIconsSection';
import { OCCASIONAL_ICONS, UPDATE_OCCASIONAL_ICONS, type OccasionalIconRow } from '../queries';
import { DuncitLocalizationProvider } from '@duncit/app-settings';

/** The real field mounts the shared ImageKit/Pexels dialog (its own queries and
 * uploads); this section only passes a URL through it. */
vi.mock('../../../components/MediaPickerField', () => ({
  default: (props: Readonly<{ label: string; value: string }>) => (
    <span aria-label={props.label}>{props.value || 'no icon'}</span>
  ),
}));

/** The real field is a MUI X DateTimePicker (a Date in, a Date out); it is
 * stubbed as the plain `datetime-local` box it replaced (LocalDateTimeField's
 * own doc comment: the value shape is unchanged) so a hand-typed window can
 * still be exercised. */
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

const EMPTY_STATE = 'No occasions yet — add one to schedule a festive icon.';

type SavedRow = OccasionalIconRow & { __typename: string };

const savedRow = (over: Partial<OccasionalIconRow> = {}): SavedRow => ({
  __typename: 'OccasionalIcon',
  slug: 'diwali',
  label: 'Diwali',
  starts_at: '2026-11-01T18:30:00.000Z',
  ends_at: '2026-11-05T18:30:00.000Z',
  icon_url: 'https://cdn.test/diya.png',
  fallback_icon: 'occasion',
  is_active: true,
  sort_order: 0,
  ...over,
});

const iconsQuery = (rows: SavedRow[]): MockedResponse => ({
  request: { query: OCCASIONAL_ICONS },
  // The mutation refetches 'OccasionalIcons', so the same mock serves twice.
  maxUsageCount: 5,
  result: { data: { branding: { __typename: 'Branding', occasional_icons: rows } } },
});

const renderSection = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <DuncitLocalizationProvider>
        <OccasionalIconsSection />
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );

const slugFields = () => screen.getAllByLabelText('Slug') as HTMLInputElement[];

describe('OccasionalIconsSection — listing', () => {
  it('invites the admin to add one when nothing is scheduled', async () => {
    renderSection([iconsQuery([])]);
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
    expect(screen.queryAllByLabelText('Slug')).toHaveLength(0);
  });

  it('stays on the empty state when no branding document exists yet', async () => {
    renderSection([
      {
        request: { query: OCCASIONAL_ICONS },
        result: { data: { branding: null } },
      },
    ]);
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
  });

  it('renders one editable row per saved occasion and drops the empty state', async () => {
    renderSection([iconsQuery([savedRow(), savedRow({ slug: 'holi', sort_order: 1 })])]);
    await waitFor(() => expect(slugFields()).toHaveLength(2));
    expect(slugFields().map((f) => f.value)).toEqual(['diwali', 'holi']);
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument();
  });
});

describe('OccasionalIconsSection — add and remove', () => {
  it('appends a blank row whose priority follows the existing ones', async () => {
    renderSection([iconsQuery([savedRow()])]);
    await waitFor(() => expect(slugFields()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: /add occasion/i }));

    expect(slugFields().map((f) => f.value)).toEqual(['diwali', '']);
    const priorities = screen.getAllByLabelText('Priority') as HTMLInputElement[];
    expect(priorities[1]).toHaveValue(1);
    expect(screen.getAllByRole('switch')[1]).toBeChecked();
  });

  it('removes only the row whose delete button was pressed', async () => {
    renderSection([iconsQuery([savedRow(), savedRow({ slug: 'holi', sort_order: 1 })])]);
    await waitFor(() => expect(slugFields()).toHaveLength(2));

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove occasion' })[1]);

    expect(slugFields().map((f) => f.value)).toEqual(['diwali']);
  });

  it('shows the empty state again once the last row is removed', async () => {
    renderSection([iconsQuery([savedRow()])]);
    await waitFor(() => expect(slugFields()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Remove occasion' }));

    expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument();
  });
});

describe('OccasionalIconsSection — saving', () => {
  const captureSave = (sent: { variables?: Record<string, unknown> }): MockedResponse => ({
    request: { query: UPDATE_OCCASIONAL_ICONS, variables: () => true },
    result: (variables) => {
      sent.variables = variables;
      return { data: { updateOccasionalIcons: [] } };
    },
  });

  it('sends only complete rows, slug normalised and dates as ISO instants', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderSection([
      iconsQuery([
        savedRow({ slug: '  DiWaLi  ' }),
        savedRow({ slug: '', label: 'half typed', sort_order: 1 }),
        savedRow({ slug: 'holi', ends_at: '', sort_order: 2 }),
        savedRow({ slug: 'new-year', starts_at: '', sort_order: 3 }),
      ]),
      captureSave(sent),
    ]);
    await waitFor(() => expect(slugFields()).toHaveLength(4));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Occasional icons saved')).toBeInTheDocument();
    expect(sent.variables).toEqual({
      input: [
        {
          slug: 'diwali',
          label: 'Diwali',
          starts_at: '2026-11-01T18:30:00.000Z',
          ends_at: '2026-11-05T18:30:00.000Z',
          icon_url: 'https://cdn.test/diya.png',
          fallback_icon: 'occasion',
          is_active: true,
          sort_order: 0,
        },
      ],
    });
  });

  it('edits only the addressed row and strips Apollo __typename', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderSection([
      iconsQuery([savedRow(), savedRow({ slug: 'holi', label: 'Holi', sort_order: 1 })]),
      captureSave(sent),
    ]);
    await waitFor(() => expect(slugFields()).toHaveLength(2));

    fireEvent.change(screen.getAllByLabelText('Label')[1], { target: { value: 'Rangwali' } });
    fireEvent.click(screen.getAllByRole('switch')[1]);
    fireEvent.change(screen.getAllByLabelText('Priority')[1], { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Occasional icons saved');
    const input = sent.variables?.input as Record<string, unknown>[];
    expect(input[0]).toMatchObject({ slug: 'diwali', label: 'Diwali', is_active: true, sort_order: 0 });
    expect(input[1]).toMatchObject({ label: 'Rangwali', is_active: false, sort_order: 4 });
    expect(input[1]).not.toHaveProperty('__typename');
  });

  it('converts a hand-typed local window into ISO instants', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderSection([iconsQuery([]), captureSave(sent)]);
    await screen.findByText(EMPTY_STATE);

    fireEvent.click(screen.getByRole('button', { name: /add occasion/i }));
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'Christmas' } });
    fireEvent.change(screen.getByLabelText('Starts at'), {
      target: { value: '2026-12-24T18:00' },
    });
    fireEvent.change(screen.getByLabelText('Ends at'), { target: { value: '2026-12-26T23:59' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Occasional icons saved');
    expect((sent.variables?.input as Record<string, unknown>[])[0]).toMatchObject({
      slug: 'christmas',
      starts_at: new Date('2026-12-24T18:00').toISOString(),
      ends_at: new Date('2026-12-26T23:59').toISOString(),
    });
  });

  it('dismisses the saved toast on Escape', async () => {
    const sent: { variables?: Record<string, unknown> } = {};
    renderSection([iconsQuery([savedRow()]), captureSave(sent)]);
    await waitFor(() => expect(slugFields()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByText('Occasional icons saved');

    fireEvent.keyDown(document.body, { key: 'Escape' });

    await waitFor(() =>
      expect(screen.queryByText('Occasional icons saved')).not.toBeInTheDocument(),
    );
  });

  it('surfaces the server error instead of the saved toast', async () => {
    renderSection([
      iconsQuery([savedRow()]),
      {
        request: { query: UPDATE_OCCASIONAL_ICONS, variables: () => true },
        error: new Error('Occasion windows overlap'),
      },
    ]);
    await waitFor(() => expect(slugFields()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Occasion windows overlap')).toBeInTheDocument();
    expect(screen.queryByText('Occasional icons saved')).not.toBeInTheDocument();
  });
});
