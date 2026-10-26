import { screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ProgressBar, ToolCard, ToolNote } from '@/components/challenge/tools/ToolCard';
import { renderWithProviders } from '@/utils/test-utils';

describe('ToolCard', () => {
  it('frames the content under a heading with the tool title', () => {
    renderWithProviders(
      <ToolCard icon="poll" title="Best snack" testID="card-1">
        <Text>inside</Text>
      </ToolCard>,
    );
    expect(screen.getByTestId('card-1')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Best snack' })).toBeOnTheScreen();
    expect(screen.getByText('inside')).toBeOnTheScreen();
  });
});

describe('ToolNote', () => {
  it('shows its text', () => {
    renderWithProviders(<ToolNote>Waiting for the host</ToolNote>);
    expect(screen.getByText('Waiting for the host')).toBeOnTheScreen();
  });
});

describe('ProgressBar', () => {
  const fillWidth = () => {
    // The filled bar is the only child that carries a percentage width.
    const fills = screen
      .UNSAFE_queryAllByProps({ height: 6 })
      .filter((n) => typeof n.props.width === 'string');
    return fills[0]?.props.width;
  };

  it.each([
    [0, '0%'],
    [37.5, '37.5%'],
    [100, '100%'],
  ])('fills %s percent', (percent, width) => {
    renderWithProviders(<ProgressBar percent={percent} />);
    expect(fillWidth()).toBe(width);
  });

  it('never overflows or goes negative', () => {
    renderWithProviders(<ProgressBar percent={250} />);
    expect(fillWidth()).toBe('100%');
    screen.unmount();
    renderWithProviders(<ProgressBar percent={-20} />);
    expect(fillWidth()).toBe('0%');
  });
});
