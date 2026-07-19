import { fireEvent, screen } from '@testing-library/react-native';

import { MeetingPhase } from '@/components/survey-onboarding/MeetingPhase';
import { SlotPicker } from '@/components/survey-onboarding/SlotPicker';
import { SurveyPhase } from '@/components/survey-onboarding/SurveyPhase';
import { renderWithProviders } from '@/utils/test-utils';

function makeAnswer(initial: Record<string, { value: string; values: string[] }> = {}) {
  const store = initial;
  const get = (qid: string) => store[qid] ?? { value: '', values: [] };
  return {
    get,
    set: (qid: string, patch: Partial<{ value: string; values: string[] }>) => {
      store[qid] = { ...get(qid), ...patch };
    },
    toggle: (q: { qid: string }, opt: string) => {
      const cur = get(q.qid).values;
      store[q.qid] = {
        ...get(q.qid),
        values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt],
      };
    },
  };
}

const sec = (qid: string, label: string, help: string | null = null) =>
  ({ qid, type: 'SECTION', label, help, required: false, multi: false, options: [] }) as never;
const text = (qid: string, label: string, required = false, help: string | null = null) =>
  ({ qid, type: 'TEXT', label, help, required, multi: false, options: [] }) as never;
const mcqMulti = (qid: string, label: string, required = true) =>
  ({ qid, type: 'MCQ', label, help: null, required, multi: true, options: ['A', 'B'] }) as never;

describe('SurveyPhase', () => {
  it('returns null when the survey has no input sections', () => {
    const survey = { id: 'sv1', title: '', questions: [sec('s1', 'Empty')] } as never;
    renderWithProviders(
      <SurveyPhase
        survey={survey}
        answer={makeAnswer()}
        busy={false}
        error={null}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('primary-action')).toBeNull();
  });

  it('steps through multiple sections, supports back, and submits on the last', () => {
    const onSubmit = jest.fn();
    const survey = {
      id: 'sv1',
      title: '',
      questions: [
        sec('s1', 'Section 1', 'Help 1'),
        text('q1', 'Name', false, 'your name'),
        sec('s2', 'Section 2'),
        text('q2', 'Town'),
      ],
    } as never;
    renderWithProviders(
      <SurveyPhase
        survey={survey}
        answer={makeAnswer()}
        busy={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('Step 1 of 2')).toBeOnTheScreen();
    expect(screen.getByText('Help 1')).toBeOnTheScreen();
    expect(screen.getByText('your name')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('q-q1'), 'Asha');
    fireEvent.press(screen.getByTestId('primary-action')); // Next
    expect(screen.getByText('Step 2 of 2')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('survey-back')); // Back
    expect(screen.getByText('Step 1 of 2')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('primary-action')); // Next
    fireEvent.press(screen.getByTestId('primary-action')); // Continue (last)
    expect(onSubmit).toHaveBeenCalled();
  });

  it('blocks advancing when a required multi-select question is unanswered', () => {
    const survey = {
      id: 'sv1',
      title: 'T',
      questions: [sec('s1', 'Section 1'), mcqMulti('q1', 'Choices')],
    } as never;
    renderWithProviders(
      <SurveyPhase
        survey={survey}
        answer={makeAnswer()}
        busy={false}
        error={null}
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(screen.getByText('Please answer all required questions.')).toBeOnTheScreen();
    expect(screen.getByTestId('required-q1')).toBeOnTheScreen();
    // Answering clears the inline required message on the next validation.
    fireEvent.press(screen.getByTestId('opt-q1-A'));
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(screen.queryByTestId('required-q1')).toBeNull();
  });

  it('shows a server error passed via props', () => {
    const survey = {
      id: 'sv1',
      title: 'T',
      questions: [sec('s1', 'Section 1'), text('q1', 'Name')],
    } as never;
    renderWithProviders(
      <SurveyPhase
        survey={survey}
        answer={makeAnswer()}
        busy={false}
        error="Server is down"
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText('Server is down')).toBeOnTheScreen();
  });
});

const meetingProps = {
  survey: null,
  answer: { get: () => ({ value: '', values: [] }) },
  slots: [
    { start_at: '2027-01-04T04:30:00.000Z', end_at: '2027-01-04T05:00:00.000Z', available: true },
    { start_at: '2027-01-04T05:00:00.000Z', end_at: '2027-01-04T05:30:00.000Z', available: false },
    { start_at: '2027-01-05T04:30:00.000Z', end_at: '2027-01-05T05:00:00.000Z', available: true },
  ],
  slotsLoading: false,
  selectedSlot: '',
  setSelectedSlot: jest.fn(),
  name: '',
  setName: jest.fn(),
  lockName: false,
  ext: '+91',
  phone: '',
  hasProfilePhone: true,
  onGoToProfile: jest.fn(),
  notes: '',
  setNotes: jest.fn(),
  busy: false,
  error: null,
  onSubmit: jest.fn(),
};

describe('SlotPicker empty fallback', () => {
  it('renders without days when no slots exist', () => {
    renderWithProviders(<SlotPicker slots={[]} value="" onChange={jest.fn()} />);
    expect(screen.queryByText('Day')).toBeOnTheScreen();
  });
});

describe('MeetingPhase slot picker', () => {
  it('renders day + slot chips with booked slots disabled, no answer recap', () => {
    const setSelectedSlot = jest.fn();
    renderWithProviders(<MeetingPhase {...meetingProps} setSelectedSlot={setSelectedSlot} />);
    expect(screen.queryByText('YOUR SURVEY ANSWERS')).toBeNull();
    expect(screen.getByTestId('meeting-phone')).toBeOnTheScreen();
    // Open slot selects; booked slot is inert.
    fireEvent.press(screen.getByTestId('slot-2027-01-04T04:30:00.000Z'));
    expect(setSelectedSlot).toHaveBeenCalledWith('2027-01-04T04:30:00.000Z');
    setSelectedSlot.mockClear();
    fireEvent.press(screen.getByTestId('slot-2027-01-04T05:00:00.000Z'));
    expect(setSelectedSlot).not.toHaveBeenCalled();
    // Switching day clears the selected slot.
    fireEvent.press(
      screen.getByTestId(`slot-day-${new Date('2027-01-05T04:30:00.000Z').toDateString()}`),
    );
    expect(setSelectedSlot).toHaveBeenCalledWith('');
  });

  it('locks name and always shows the profile phone read-only', () => {
    renderWithProviders(
      <MeetingPhase {...meetingProps} name="Asha Roy" lockName phone="9876543210" />,
    );
    // One "From your profile." for the locked name, one for the always-read-only phone.
    expect(screen.getAllByText('From your profile.')).toHaveLength(2);
    expect(screen.getByTestId('meeting-phone').props.value).toBe('9876543210');
  });

  it('shows the loading and empty states', () => {
    const { rerender } = renderWithProviders(
      <MeetingPhase {...meetingProps} slots={[]} slotsLoading />,
    );
    expect(screen.getByTestId('slots-loading')).toBeOnTheScreen();
    rerender(<MeetingPhase {...meetingProps} slots={[]} slotsLoading={false} />);
    expect(screen.getByTestId('slots-empty')).toBeOnTheScreen();
  });

  it('prompts to add a missing phone with a Go To Profile action', () => {
    const onGoToProfile = jest.fn();
    renderWithProviders(
      <MeetingPhase {...meetingProps} hasProfilePhone={false} onGoToProfile={onGoToProfile} />,
    );
    expect(screen.getByTestId('meeting-phone-missing')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('meeting-go-to-profile'));
    expect(onGoToProfile).toHaveBeenCalled();
  });
});
