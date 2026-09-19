import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyStepper from '@/components/lead-survey/SurveyStepper';
import SurveyQuestionField from '@/components/lead-survey/SurveyQuestionField';
import { splitSections } from '@/components/lead-survey/surveySections';
import { question, venueSurvey } from './fixtures';

describe('splitSections', () => {
  it('opens a fallback section for questions before the first heading and drops empty headings', () => {
    const sections = splitSections([
      question({ qid: 'a', label: 'Contact name' }),
      question({ qid: 'h', type: 'SECTION', label: 'Pricing', help: 'Per hour' }),
      question({ qid: 'b', label: 'Hourly rate' }),
      question({ qid: 'e', type: 'SECTION', label: 'Empty' }),
    ]);

    expect(sections.map((s) => s.title)).toEqual(['Details', 'Pricing']);
    expect(sections[1]).toMatchObject({ help: 'Per hour', questions: [expect.objectContaining({ qid: 'b' })] });
  });

  it('titles an unnamed heading with the fallback', () => {
    const sections = splitSections([question({ qid: 'h', type: 'SECTION', label: '' }), question({ qid: 'a' })], 'Survey');
    expect(sections[0].title).toBe('Survey');
  });
});

describe('SurveyStepper', () => {
  it('walks the sections, enforcing required answers, and submits every answer', () => {
    const onSubmit = vi.fn();
    render(<SurveyStepper survey={venueSurvey} submitting={false} onSubmit={onSubmit} submitLabel="Save survey" />);

    expect(screen.getByRole('heading', { name: 'About the venue' })).toBeInTheDocument();
    expect(screen.getByText('Tell us the basics')).toBeInTheDocument();
    expect(screen.getByText('Venue name *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Please answer: Venue name')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Venue name' }), { target: { value: 'Grand Hall' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Please answer: Amenities')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Parking' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }));
    expect(screen.getByRole('checkbox', { name: 'Wi-Fi' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('heading', { name: 'Venue onboarding' })).toBeInTheDocument();
    expect(screen.queryByText(/Please answer/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('textbox', { name: 'Venue name' })).toHaveValue('Grand Hall');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.click(screen.getByRole('radio', { name: 'Outdoor' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Anything else' }), { target: { value: 'Rooftop access' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save survey' }));

    expect(onSubmit).toHaveBeenCalledWith([
      { qid: 'q1', value: 'Grand Hall' },
      { qid: 'q2', values: ['Parking'] },
      { qid: 'q3', value: 'Outdoor' },
      { qid: 'q4', value: 'Rooftop access' },
    ]);
  });

  it('prefills earlier answers and blocks a submit that is still missing one', () => {
    const onSubmit = vi.fn();
    const single = {
      ...venueSurvey,
      questions: [question({ qid: 'q1', label: 'Venue name', required: true }), question({ qid: 'q9', label: 'Owner' })],
    };
    render(
      <SurveyStepper
        survey={single}
        initialAnswers={[
          { qid: 'q1', value: null, values: [] },
          { qid: 'q9', value: 'Meera', values: [] },
        ]}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    // One section (titled after the survey): no step strip, and the default submit label.
    expect(screen.getByRole('heading', { name: 'Venue onboarding' })).toBeInTheDocument();
    expect(document.querySelector('.MuiStepper-root')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Owner' })).toHaveValue('Meera');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByText('Please answer: Venue name')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('locks the actions while saving', () => {
    render(<SurveyStepper survey={{ ...venueSurvey, questions: [question({ qid: 'q1' })] }} submitting onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('locks Next while saving on an earlier step', () => {
    render(<SurveyStepper survey={venueSurvey} submitting onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('says so when a survey has no questions to answer', () => {
    render(<SurveyStepper survey={{ ...venueSurvey, questions: [question({ type: 'SECTION', label: 'Intro' })] }} submitting={false} onSubmit={vi.fn()} />);
    expect(screen.getByText('This survey has no questions.')).toBeInTheDocument();
  });
});

describe('SurveyQuestionField', () => {
  it('reports typed text and a picked single choice', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SurveyQuestionField question={question({ label: 'Notes', type: 'TEXTAREA', help: 'Optional' })} answer={{ value: '', values: [] }} onChange={onChange} />,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), { target: { value: 'Near metro' } });
    expect(onChange).toHaveBeenLastCalledWith({ value: 'Near metro' });

    rerender(
      <SurveyQuestionField
        question={question({ label: 'Seating', type: 'MCQ', options: ['Theatre', 'Banquet'] })}
        answer={{ value: '', values: [] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Banquet' }));
    expect(onChange).toHaveBeenLastCalledWith({ value: 'Banquet' });
  });
});
