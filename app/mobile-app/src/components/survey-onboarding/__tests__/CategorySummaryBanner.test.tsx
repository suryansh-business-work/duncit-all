import { fireEvent, screen } from '@testing-library/react-native';

import { CategorySummaryBanner } from '@/components/survey-onboarding/CategorySummaryBanner';
import { renderWithProviders } from '@/utils/test-utils';

describe('CategorySummaryBanner', () => {
  it('shows the Super › Category › Sub summary and fires onChange', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <CategorySummaryBanner
        labels={{ super: 'Sports', category: 'Cricket', sub: 'Box' }}
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Sports › Cricket › Box')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('category-change'));
    expect(onChange).toHaveBeenCalled();
  });

  it('drops empty levels from the summary', () => {
    renderWithProviders(
      <CategorySummaryBanner
        labels={{ super: 'Sports', category: '', sub: '' }}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText('Sports')).toBeOnTheScreen();
  });

  it('renders nothing when no category is chosen yet', () => {
    renderWithProviders(
      <CategorySummaryBanner labels={{ super: '', category: '', sub: '' }} onChange={jest.fn()} />,
    );
    expect(screen.queryByTestId('category-banner')).toBeNull();
  });
});
