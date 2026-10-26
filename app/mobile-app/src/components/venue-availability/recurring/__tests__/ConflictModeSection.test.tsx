import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import type { ConflictMode } from '../recurring-form';
import { ConflictModeSection } from '../ConflictModeSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mount = (value: ConflictMode) => {
  const onChange = jest.fn();
  renderWithProviders(<ConflictModeSection value={value} onChange={onChange} />);
  return onChange;
};

describe('ConflictModeSection', () => {
  it('offers skip and replace with what each does', () => {
    mount('SKIP');
    expect(screen.getByText('availability.recurring.whenSlotsOverlap')).toBeOnTheScreen();
    expect(screen.getByText('availability.recurring.overlapSkipHint')).toBeOnTheScreen();
    expect(screen.getByText('availability.recurring.overlapReplaceHint')).toBeOnTheScreen();
  });

  it('marks skip as the chosen option and shows no warning', () => {
    mount('SKIP');
    expect(screen.getByTestId('recurring-conflict-SKIP').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('recurring-conflict-REPLACE').props['aria-checked']).toBe(false);
    expect(screen.queryByTestId('recurring-conflict-warning')).toBeNull();
  });

  it('marks replace as chosen and warns that it deletes slots', () => {
    mount('REPLACE');
    expect(screen.getByTestId('recurring-conflict-REPLACE').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('recurring-conflict-SKIP').props['aria-checked']).toBe(false);
    expect(screen.getByTestId('recurring-conflict-warning')).toHaveTextContent(
      'availability.recurring.overlapReplaceWarning',
    );
  });

  it('reports the mode that was picked', () => {
    const onChange = mount('SKIP');
    fireEvent.press(screen.getByTestId('recurring-conflict-REPLACE'));
    fireEvent.press(screen.getByTestId('recurring-conflict-SKIP'));
    expect(onChange).toHaveBeenNthCalledWith(1, 'REPLACE');
    expect(onChange).toHaveBeenNthCalledWith(2, 'SKIP');
  });
});
