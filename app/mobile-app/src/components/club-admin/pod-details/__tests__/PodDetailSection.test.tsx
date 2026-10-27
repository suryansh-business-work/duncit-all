import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { renderWithProviders } from '@/utils/test-utils';
import { PodDetailSection } from '../PodDetailSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mount = (props: Partial<React.ComponentProps<typeof PodDetailSection>> = {}) =>
  renderWithProviders(
    <PodDetailSection title="Attendees" testID="sec" {...props}>
      <Text>body</Text>
    </PodDetailSection>,
  );

describe('PodDetailSection', () => {
  it('shows a heading and its body', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Attendees' })).toBeOnTheScreen();
    expect(screen.getByText('body')).toBeOnTheScreen();
  });

  it('shows a count beside the title when it is above zero', () => {
    mount({ badge: 3 });
    expect(screen.getByTestId('sec-badge')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it.each([0, undefined])('hides the count when it is %s', (badge) => {
    mount({ badge });
    expect(screen.queryByTestId('sec-badge')).toBeNull();
  });

  it('shows a progress spinner while loading', () => {
    mount({ isLoading: true });
    expect(screen.getByTestId('sec-loading')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.a11y.loading')).toBeOnTheScreen();
  });

  it('shows no spinner once loaded', () => {
    mount();
    expect(screen.queryByTestId('sec-loading')).toBeNull();
  });

  it('says the load failed and offers a retry', () => {
    const onRetry = jest.fn();
    mount({ hasError: true, onRetry });
    expect(screen.getByTestId('sec-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('sec-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no error without a way to retry, and none when nothing failed', () => {
    mount({ hasError: true });
    expect(screen.queryByTestId('sec-error')).toBeNull();
  });

  it('shows the empty sentence when given one', () => {
    mount({ emptyText: 'Nobody joined' });
    expect(screen.getByTestId('sec-empty')).toHaveTextContent('Nobody joined');
  });

  it.each([null, undefined, ''])('shows no empty line for %j', (emptyText) => {
    mount({ emptyText });
    expect(screen.queryByTestId('sec-empty')).toBeNull();
  });
});
