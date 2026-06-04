import { fireEvent, screen } from '@testing-library/react-native';

import { SuperCategoryGroup } from '@/components/survey/SuperCategoryGroup';
import { SurveyChip } from '@/components/survey/SurveyChip';
import { SurveyFooter } from '@/components/survey/SurveyFooter';
import { SurveyProgress } from '@/components/survey/SurveyProgress';
import { colorForId, emojiFromIcon, withAlpha } from '@/constants/survey-palette';
import type { SurveyCategory } from '@/hooks/useSurvey';
import { renderWithProviders } from '@/utils/test-utils';

// SurveyFooter reads safe-area insets; provide them without a SafeAreaProvider.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('survey-palette', () => {
  it('hashes an id to a stable colour', () => {
    expect(colorForId('c1')).toBe(colorForId('c1'));
    expect(colorForId('c1')).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('returns emoji only for short non-ASCII icons', () => {
    expect(emojiFromIcon('🎨')).toBe('🎨');
    expect(emojiFromIcon('mui:Restaurant')).toBeUndefined();
    expect(emojiFromIcon('')).toBeUndefined();
    expect(emojiFromIcon(null)).toBeUndefined();
  });
  it('converts hex to rgba and passes through invalid input', () => {
    expect(withAlpha('#ff5757', 0.1)).toBe('rgba(255, 87, 87, 0.1)');
    expect(withAlpha('not-a-hex', 0.5)).toBe('not-a-hex');
  });
});

describe('SurveyChip', () => {
  it('renders an emoji label and toggles on press', () => {
    const onToggle = jest.fn();
    renderWithProviders(
      <SurveyChip id="c1" label="Art" icon="🎨" selected={false} onToggle={onToggle} large />,
    );
    expect(screen.getByText('🎨')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chip-c1'));
    expect(onToggle).toHaveBeenCalledWith('c1');
  });
  it('reflects the selected state', () => {
    renderWithProviders(<SurveyChip id="c2" label="Music" selected onToggle={jest.fn()} />);
    expect(screen.getByTestId('chip-c2').props['aria-selected']).toBe(true);
  });
});

describe('SuperCategoryGroup', () => {
  const childrenByParent = new Map<string | null, SurveyCategory[]>([
    ['s1', [{ id: 'c1', name: 'Art' }]],
  ]);
  it('renders the group title and its chips', () => {
    renderWithProviders(
      <SuperCategoryGroup
        superCategory={{ id: 's1', name: 'For You', icon: '✨' }}
        childrenByParent={childrenByParent}
        selected={new Set()}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText('For You')).toBeOnTheScreen();
    expect(screen.getByTestId('chip-c1')).toBeOnTheScreen();
  });
  it('shows an empty message when there are no interests', () => {
    renderWithProviders(
      <SuperCategoryGroup
        superCategory={{ id: 'empty', name: 'Empty' }}
        childrenByParent={new Map()}
        selected={new Set()}
        onToggle={jest.fn()}
      />,
    );
    expect(screen.getByText(/no interests in this group/i)).toBeOnTheScreen();
  });
});

describe('SurveyFooter + SurveyProgress', () => {
  it('renders the count/total and fires submit when enabled', () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <SurveyFooter count={3} total={28} saving={false} canSubmit onSubmit={onSubmit} />,
    );
    expect(screen.getByText('/ 28', { exact: false })).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it('shows the saving label and disables submit', () => {
    const onSubmit = jest.fn();
    renderWithProviders(
      <SurveyFooter count={1} total={28} saving canSubmit={false} onSubmit={onSubmit} />,
    );
    expect(screen.getByText('Saving…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('survey-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it('renders the progress bar', () => {
    renderWithProviders(<SurveyProgress value={150} />);
    expect(screen.getByTestId('survey-progress')).toBeOnTheScreen();
  });
});
