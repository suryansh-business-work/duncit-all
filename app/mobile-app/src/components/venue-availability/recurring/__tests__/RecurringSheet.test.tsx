import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { RecurringSheet } from '../RecurringSheet';
import { useRecurringSheet } from '../useRecurringSheet';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('../useRecurringSheet', () => ({ useRecurringSheet: jest.fn() }));

const mockBasic = jest.fn();
const mockPreview = jest.fn();
const mockAdvanced = jest.fn();
jest.mock('../RecurringBasicSection', () => ({
  RecurringBasicSection: (props: Record<string, unknown>) => {
    mockBasic(props);
    return null;
  },
}));
jest.mock('../PreviewSummaryCard', () => ({
  PreviewSummaryCard: (props: Record<string, unknown>) => {
    mockPreview(props);
    return null;
  },
}));
jest.mock('../../advanced/AdvancedSections', () => ({
  AdvancedSections: (props: Record<string, unknown>) => {
    mockAdvanced(props);
    return null;
  },
}));

const sheetMock = jest.mocked(useRecurringSheet);

const stateOf = (patch: Record<string, unknown> = {}) => ({
  form: { startDate: new Date(2030, 0, 9), endDate: new Date(2030, 0, 12) },
  patch: jest.fn(),
  reset: jest.fn(),
  venueSettings: {
    rules: { max_advance_days: 30 },
    operating_hours: { open: '08:00', close: '22:00' },
  },
  result: { errors: [] as string[], summary: { total: 6 } },
  submit: jest.fn().mockResolvedValue(true),
  submitting: false,
  serverError: null as string | null,
  ...patch,
});

const mount = (state = stateOf()) => {
  sheetMock.mockReturnValue(state as unknown as ReturnType<typeof useRecurringSheet>);
  const onClose = jest.fn();
  const onSlotsChanged = jest.fn();
  const onVenueChanged = jest.fn();
  renderWithProviders(
    <RecurringSheet
      open
      onClose={onClose}
      venueId="v1"
      settings={{ raw: true }}
      capacityItems={[{ label: 'Court 1', capacity: 4 }]}
      venueCapacity={20}
      onSlotsChanged={onSlotsChanged}
      onVenueChanged={onVenueChanged}
    />,
  );
  return { state, onClose, onSlotsChanged, onVenueChanged };
};

const create = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('recurring-create'));
  });

beforeEach(() => jest.clearAllMocks());

describe('RecurringSheet', () => {
  it('feeds the hook the venue, its settings and spaces, and the slot-change callback', () => {
    const { onSlotsChanged } = mount();
    expect(sheetMock).toHaveBeenCalledWith(
      'v1',
      { raw: true },
      [{ label: 'Court 1', capacity: 4 }],
      20,
      onSlotsChanged,
    );
  });

  it('shows the title and wires the basic section, preview and advanced sections', () => {
    const { state, onVenueChanged, onSlotsChanged } = mount();
    expect(screen.getByText('availability.recurring.title')).toBeOnTheScreen();
    expect(mockBasic.mock.calls[0][0]).toMatchObject({
      form: state.form,
      patch: state.patch,
      settings: state.venueSettings,
    });
    expect(mockPreview.mock.calls[0][0]).toMatchObject({ summary: state.result.summary });
    expect(mockAdvanced.mock.calls[0][0]).toMatchObject({
      venueId: 'v1',
      form: state.form,
      patch: state.patch,
      settings: state.venueSettings,
      onVenueChanged,
      onSlotsChanged,
    });
  });

  it('caps the advance limit shown in the preview at what the server allows', () => {
    mount(
      stateOf({
        venueSettings: {
          rules: { max_advance_days: 5000 },
          operating_hours: { open: '', close: '' },
        },
      }),
    );
    expect(mockPreview.mock.calls[0][0].maxAdvanceDays).toBeLessThanOrEqual(60);
  });
});

describe('RecurringSheet — the create button', () => {
  it('counts the slots it will create', () => {
    mount();
    expect(screen.getByLabelText('availability.recurring.createSlots|6')).toBeOnTheScreen();
    expect(screen.getByTestId('recurring-create')).toBeEnabled();
  });

  it('says "create slot" for exactly one', () => {
    mount(stateOf({ result: { errors: [], summary: { total: 1 } } }));
    expect(screen.getByLabelText('availability.recurring.createSlot')).toBeOnTheScreen();
    expect(screen.getByTestId('recurring-create')).toBeEnabled();
  });

  it('is disabled when nothing would be created', () => {
    mount(stateOf({ result: { errors: [], summary: { total: 0 } } }));
    expect(screen.getByTestId('recurring-create')).toBeDisabled();
  });

  it('is disabled while the run has errors', () => {
    mount(stateOf({ result: { errors: ['pickWeekday'], summary: { total: 4 } } }));
    expect(screen.getByTestId('recurring-create')).toBeDisabled();
  });

  it('shows the creating label and cannot be cancelled while submitting', () => {
    mount(stateOf({ submitting: true }));
    expect(screen.getByLabelText('availability.recurring.creating')).toBeOnTheScreen();
    expect(screen.getByTestId('recurring-create')).toBeDisabled();
    expect(screen.getByTestId('recurring-cancel')).toBeDisabled();
  });
});

describe('RecurringSheet — creating and closing', () => {
  it('closes and resets the form once the slots are created', async () => {
    const { state, onClose } = mount();
    await create();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(state.submit).toHaveBeenCalledTimes(1);
    expect(state.reset).toHaveBeenCalledTimes(1);
  });

  it('stays open, keeping the form, when the create did not go through', async () => {
    const { state, onClose } = mount(stateOf({ submit: jest.fn().mockResolvedValue(false) }));
    await create();
    await waitFor(() => expect(state.submit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(state.reset).not.toHaveBeenCalled();
  });

  it('closes and resets on cancel without creating', () => {
    const { state, onClose } = mount();
    fireEvent.press(screen.getByTestId('recurring-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(state.submit).not.toHaveBeenCalled();
  });
});

describe('RecurringSheet — messages', () => {
  it('shows the server error', () => {
    mount(stateOf({ serverError: 'Overlaps an existing slot' }));
    expect(screen.getByTestId('recurring-server-error')).toHaveTextContent(
      'Overlaps an existing slot',
    );
  });

  it('shows no server error by default', () => {
    mount();
    expect(screen.queryByTestId('recurring-server-error')).toBeNull();
  });

  it('explains the first problem once both dates are picked', () => {
    mount(stateOf({ result: { errors: ['pickWeekday', 'overlap'], summary: { total: 0 } } }));
    expect(screen.getByTestId('recurring-issue')).toHaveTextContent(
      'availability.recurring.pickWeekday',
    );
  });

  it('stays quiet about problems until both dates are picked', () => {
    mount(
      stateOf({
        form: { startDate: new Date(2030, 0, 9), endDate: null },
        result: { errors: ['pickDates'], summary: { total: 0 } },
      }),
    );
    expect(screen.queryByTestId('recurring-issue')).toBeNull();
  });

  it('stays quiet when there is no start date either', () => {
    mount(
      stateOf({
        form: { startDate: null, endDate: new Date(2030, 0, 9) },
        result: { errors: ['pickDates'], summary: { total: 0 } },
      }),
    );
    expect(screen.queryByTestId('recurring-issue')).toBeNull();
  });

  it('shows no problem line when there are none', () => {
    mount();
    expect(screen.queryByTestId('recurring-issue')).toBeNull();
  });
});
