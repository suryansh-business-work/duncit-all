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

  it('shows the selected pod and opens the list to switch pods', () => {
    const onChange = jest.fn();
    renderWithProviders(
      <PodPicker options={[opt('a'), opt('b')]} selectedId="a" onChange={onChange} />,
    );
    expect(screen.getByTestId('pod-picker')).toBeOnTheScreen();
    expect(screen.getByText('Pod a')).toBeOnTheScreen();
    // Collapsed by default — the options list is hidden until tapped.
    expect(screen.queryByTestId('pod-picker-options')).toBeNull();

    fireEvent.press(screen.getByTestId('pod-picker'));
    expect(screen.getByTestId('pod-picker-options')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-option-b'));
    expect(onChange).toHaveBeenCalledWith('b');
    // Selecting collapses the dropdown again.
    expect(screen.queryByTestId('pod-picker-options')).toBeNull();
  });

  it('prompts to select a pod when none matches, and toggles closed', () => {
    renderWithProviders(<PodPicker options={[opt('a')]} selectedId="" onChange={jest.fn()} />);
    expect(screen.getByText('Select a pod')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-picker'));
    expect(screen.getByTestId('pod-picker-options')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-picker'));
    expect(screen.queryByTestId('pod-picker-options')).toBeNull();
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
