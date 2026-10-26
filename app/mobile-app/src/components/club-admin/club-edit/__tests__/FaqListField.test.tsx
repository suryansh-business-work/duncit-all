import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import type { ClubFaqRow } from '../club-edit.form';
import { FaqListField } from '../FaqListField';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const ROWS: ClubFaqRow[] = [
  { id: 'f1', question: 'When?', answer: 'Sundays' },
  { id: 'f2', question: 'Where?', answer: 'Park' },
];

const mount = (value: ClubFaqRow[], error?: string) => {
  const onChange = jest.fn();
  renderWithProviders(<FaqListField value={value} onChange={onChange} error={error} />);
  return onChange;
};

describe('FaqListField', () => {
  it('shows each pair of question and answer', () => {
    mount(ROWS);
    expect(screen.getByTestId('field-club-edit-faq-f1-question').props.value).toBe('When?');
    expect(screen.getByTestId('field-club-edit-faq-f1-answer').props.value).toBe('Sundays');
    expect(screen.getByTestId('field-club-edit-faq-f2-question').props.value).toBe('Where?');
  });

  it('shows the error under the list', () => {
    mount(ROWS, 'Finish both sides');
    expect(screen.getByText('Finish both sides')).toBeOnTheScreen();
  });

  it('edits the question of one row only', () => {
    const onChange = mount(ROWS);
    fireEvent.changeText(screen.getByTestId('field-club-edit-faq-f2-question'), 'Which park?');
    expect(onChange).toHaveBeenCalledWith([ROWS[0], { ...ROWS[1], question: 'Which park?' }]);
  });

  it('edits the answer of one row only', () => {
    const onChange = mount(ROWS);
    fireEvent.changeText(screen.getByTestId('field-club-edit-faq-f1-answer'), 'Saturdays');
    expect(onChange).toHaveBeenCalledWith([{ ...ROWS[0], answer: 'Saturdays' }, ROWS[1]]);
  });

  it('removes one row', () => {
    const onChange = mount(ROWS);
    fireEvent.press(screen.getByTestId('club-edit-faq-f1-remove'));
    expect(onChange).toHaveBeenCalledWith([ROWS[1]]);
  });

  it('adds a blank row with a fresh id after the existing ones', () => {
    const onChange = mount(ROWS);
    fireEvent.press(screen.getByTestId('club-edit-faq-add'));
    const next = onChange.mock.calls[0][0] as ClubFaqRow[];
    expect(next.slice(0, 2)).toEqual(ROWS);
    expect(next[2]).toMatchObject({ question: '', answer: '' });
    expect(ROWS.map((row) => row.id)).not.toContain(next[2]?.id);
  });

  it('offers only the add button for a club with no FAQs', () => {
    mount([]);
    expect(screen.getByTestId('club-edit-faq-add')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-edit-faq-f1')).toBeNull();
  });
});
