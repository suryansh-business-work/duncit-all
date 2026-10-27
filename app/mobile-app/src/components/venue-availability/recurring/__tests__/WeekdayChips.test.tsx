import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { WeekdayChips } from '../WeekdayChips';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mount = (value: number[], weeklyOff?: number[]) => {
  const onChange = jest.fn();
  renderWithProviders(
    <WeekdayChips value={value} onChange={onChange} weeklyOff={weeklyOff} testID="days" />,
  );
  return onChange;
};

const day = (n: number) => screen.getByTestId(`days-day-${n}`);

describe('WeekdayChips', () => {
  it('shows seven day chips, Sunday first, marking the chosen ones', () => {
    mount([1, 3]);
    for (let n = 0; n < 7; n += 1) {
      expect(day(n).props['aria-checked']).toBe(n === 1 || n === 3);
    }
  });

  it('adds a day, keeping the days in order', () => {
    const onChange = mount([1, 5]);
    fireEvent.press(day(3));
    expect(onChange).toHaveBeenCalledWith([1, 3, 5]);
  });

  it('removes a chosen day', () => {
    const onChange = mount([1, 3, 5]);
    fireEvent.press(day(3));
    expect(onChange).toHaveBeenCalledWith([1, 5]);
  });

  it('can empty the selection', () => {
    const onChange = mount([2]);
    fireEvent.press(day(2));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it.each([
    ['all', [0, 1, 2, 3, 4, 5, 6]],
    ['weekdays', [1, 2, 3, 4, 5]],
    ['weekends', [0, 6]],
  ])('the %s preset picks exactly those days', (id, days) => {
    const onChange = mount([3]);
    fireEvent.press(screen.getByTestId(`days-preset-${id}`));
    expect(onChange).toHaveBeenCalledWith(days);
  });

  it('hands out a fresh array for a preset so the preset cannot be mutated', () => {
    const onChange = mount([]);
    fireEvent.press(screen.getByTestId('days-preset-weekends'));
    fireEvent.press(screen.getByTestId('days-preset-weekends'));
    expect(onChange.mock.calls[0][0]).not.toBe(onChange.mock.calls[1][0]);
  });

  it('keeps a closed weekday selectable', () => {
    const onChange = mount([], [0]);
    fireEvent.press(day(0));
    expect(onChange).toHaveBeenCalledWith([0]);
  });
});
