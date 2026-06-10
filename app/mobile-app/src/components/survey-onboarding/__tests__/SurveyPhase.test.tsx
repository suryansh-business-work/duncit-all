import { fireEvent, screen } from '@testing-library/react-native';

import { MeetingPhase } from '@/components/survey-onboarding/MeetingPhase';
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
    expect(screen.getByText('Please answer: Choices')).toBeOnTheScreen();
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

describe('MeetingPhase without a survey', () => {
  it('renders the meeting form with no answer recap', () => {
    renderWithProviders(
      <MeetingPhase
        survey={null}
        answer={{ get: () => ({ value: '', values: [] }) }}
        when=""
        setWhen={jest.fn()}
        notes=""
        setNotes={jest.fn()}
        busy={false}
        error={null}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('meeting-when')).toBeOnTheScreen();
    expect(screen.queryByText('YOUR SURVEY ANSWERS')).toBeNull();
  });
});
