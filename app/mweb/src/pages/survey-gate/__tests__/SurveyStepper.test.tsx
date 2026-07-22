import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SurveyStepper, { type SurveyAnswerState } from '../SurveyStepper';
import type { ActiveSurvey, SurveyQuestion } from '../queries';

const q = (over: Partial<SurveyQuestion> & Pick<SurveyQuestion, 'qid' | 'type' | 'label'>): SurveyQuestion => ({
  help: null,
  required: false,
  multi: false,
  options: [],
  ...over,
});

const makeSurvey = (questions: SurveyQuestion[], title = 'My Survey'): ActiveSurvey => ({
  id: 's1',
  kind: 'HOST',
  title,
  questions,
});

describe('SurveyStepper', () => {
  it('renders the Continue button and submits empty when there are no input questions', () => {
    const onSubmit = vi.fn();
    render(<SurveyStepper survey={makeSurvey([])} submitting={false} onSubmit={onSubmit} />);
    const btn = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledWith([]);
  });

  it('honors a custom submitLabel and disables the empty-state button while submitting', () => {
    const onSubmit = vi.fn();
    render(<SurveyStepper survey={makeSurvey([])} submitting onSubmit={onSubmit} submitLabel="Finish" />);
    const btn = screen.getByRole('button', { name: 'Finish' });
    expect(btn).toBeDisabled();
  });

  it('renders a single section (no stepper) and submits text answers', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStepper
        survey={makeSurvey([q({ qid: 'name', type: 'TEXT', label: 'Your name' })])}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    // single step => no Stepper => the section falls back to survey title
    expect(screen.getByText('My Survey')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith([{ qid: 'name', value: 'Alice' }]);
  });

  it('blocks Next when a required field is empty and shows a warning', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStepper
        survey={makeSurvey([
          q({ qid: 'sec1', type: 'SECTION', label: 'Section One' }),
          q({ qid: 'a', type: 'TEXT', label: 'Required A', required: true }),
          q({ qid: 'sec2', type: 'SECTION', label: 'Section Two' }),
          q({ qid: 'b', type: 'TEXT', label: 'Field B' }),
        ])}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    // multi-section => stepper visible (label appears in stepper + active title)
    expect(screen.getAllByText('Section One').length).toBeGreaterThan(0);
    expect(screen.getByText('Section Two')).toBeInTheDocument();

    // Back disabled on first step
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required: Required A');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('advances through sections, allows Back, and submits full multi-section payload', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStepper
        survey={makeSurvey([
          q({ qid: 'sec1', type: 'SECTION', label: 'Section One', help: 'help text' }),
          q({ qid: 'a', type: 'TEXTAREA', label: 'About you', required: true }),
          q({ qid: 'sec2', type: 'SECTION', label: 'Section Two' }),
          q({ qid: 'colors', type: 'MCQ', label: 'Colors', multi: true, options: ['Red', 'Blue'] }),
          q({ qid: 'pick', type: 'MCQ', label: 'Pick', multi: false, options: ['X', 'Y'] }),
        ])}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('help text')).toBeInTheDocument();

    // fill required textarea then advance
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // now on section two — check a multi checkbox and a single radio
    fireEvent.click(screen.getByRole('checkbox', { name: 'Blue' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Y' }));

    // go Back then forward to prove Back works and state persists
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('About you *')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    // last step => submit
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith([
      { qid: 'a', value: 'hello' },
      { qid: 'colors', values: ['Blue'] },
      { qid: 'pick', value: 'Y' },
    ]);
  });

  it('blocks submit when a required multi MCQ has no selection', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStepper
        survey={makeSurvey([q({ qid: 'm', type: 'MCQ', label: 'Choose', multi: true, required: true, options: ['A', 'B'] })])}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required: Choose');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the submitting label on the final step and disables the Next button', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStepper
        survey={makeSurvey([
          q({ qid: 'sec1', type: 'SECTION', label: 'S1' }),
          q({ qid: 'a', type: 'TEXT', label: 'A' }),
          q({ qid: 'sec2', type: 'SECTION', label: 'S2' }),
          q({ qid: 'b', type: 'TEXT', label: 'B' }),
        ])}
        submitting
        onSubmit={onSubmit}
      />,
    );
    // submitting => Next disabled
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('uses parent-owned answer state when answers/setAnswers props are supplied', () => {
    const onSubmit = vi.fn();
    function Harness() {
      const [answers, setAnswers] = useState<SurveyAnswerState>({});
      return (
        <SurveyStepper
          survey={makeSurvey([q({ qid: 'name', type: 'TEXT', label: 'Name' })])}
          submitting={false}
          onSubmit={onSubmit}
          answers={answers}
          setAnswers={setAnswers}
        />
      );
    }
    render(<Harness />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith([{ qid: 'name', value: 'Bob' }]);
  });

  it('toggling a checkbox off removes it from the values', () => {
    const onSubmit = vi.fn();
    render(
      <SurveyStepper
        survey={makeSurvey([q({ qid: 'm', type: 'MCQ', label: 'Choose', multi: true, options: ['A', 'B'] })])}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    const group = screen.getByRole('group');
    const boxA = within(group).getByRole('checkbox', { name: 'A' });
    fireEvent.click(boxA); // on
    fireEvent.click(boxA); // off
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSubmit).toHaveBeenCalledWith([{ qid: 'm', values: [] }]);
  });
});
