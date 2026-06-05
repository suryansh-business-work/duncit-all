import { fireEvent, screen } from '@testing-library/react-native';

import { PodPicker, RatingStars } from '@/components/support-live';
import { renderWithProviders } from '@/utils/test-utils';
import type { SupportPodOption } from '@/utils/support-pods';

const opt = (id: string): SupportPodOption => ({
  membershipId: `m-${id}`,
  podDocId: id,
  podSlug: `s-${id}`,
  title: `Pod ${id}`,
  startsAt: '2026-06-07T00:00:00Z',
  endsAt: null,
});

describe('PodPicker', () => {
  it('shows the empty state when there are no options', () => {
    renderWithProviders(<PodPicker options={[]} selectedId="" onChange={jest.fn()} />);
    expect(screen.getByTestId('pod-picker-empty')).toBeOnTheScreen();
  });

  it('renders options and selects one', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <PodPicker options={[opt('a'), opt('b')]} selectedId="a" onChange={onChange} />,
    );
    expect(screen.getByTestId('pod-picker')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-option-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('RatingStars', () => {
  it('renders N stars and reports the tapped value', () => {
    const onChange = jest.fn();
    renderWithProviders(<RatingStars value={2} onChange={onChange} />);
    expect(screen.getByTestId('rating-stars')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('rating-star-4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
