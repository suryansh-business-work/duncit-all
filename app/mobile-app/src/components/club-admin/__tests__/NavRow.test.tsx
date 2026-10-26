import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { renderWithProviders } from '@/utils/test-utils';
import { NavRow, RowBadge, RowDivider } from '../NavRow';
import { useToneColors, useTrendPalette } from '../tone';

const mount = (props: Partial<React.ComponentProps<typeof NavRow>> = {}) => {
  const onPress = props.onPress ?? jest.fn();
  renderWithProviders(
    <NavRow testID="row" icon="groups" label="Your clubs" {...props} onPress={onPress} />,
  );
  return onPress;
};

describe('NavRow', () => {
  it('shows its label, named for a screen reader, and opens when pressed', () => {
    const onPress = mount();
    expect(screen.getByText('Your clubs')).toBeOnTheScreen();
    expect(screen.getByTestId('row').props['aria-label']).toBe('Your clubs');
    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a caption under the label when given one', () => {
    mount({ caption: 'Nothing approved yet', captionTestID: 'row-caption' });
    expect(screen.getByTestId('row-caption')).toHaveTextContent('Nothing approved yet');
  });

  it('shows no caption without one', () => {
    mount();
    expect(screen.queryByTestId('row-caption')).toBeNull();
  });

  it('shows a badge before the chevron', () => {
    mount({ badge: <Text testID="row-badge">3</Text> });
    expect(screen.getByTestId('row-badge')).toBeOnTheScreen();
  });

  it('is inert and announced as disabled when disabled', async () => {
    const onPress = mount({ disabled: true });
    expect(screen.getByTestId('row').props['aria-disabled']).toBe(true);
    await userEvent.setup().press(screen.getByTestId('row'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is enabled by default', () => {
    mount();
    expect(screen.getByTestId('row').props['aria-disabled']).toBe(false);
  });
});

describe('RowBadge', () => {
  it('shows a count pill', () => {
    renderWithProviders(<RowBadge testID="badge" label="7" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('7');
  });
});

describe('RowDivider', () => {
  it('draws a hairline', () => {
    const view = renderWithProviders(<RowDivider />);
    expect(view.toJSON()).not.toBeNull();
  });
});

describe('tone colours', () => {
  function Probe<T extends Record<string, string>>({ read }: Readonly<{ read: () => T }>) {
    const colours = read();
    return <Text testID="probe">{JSON.stringify(colours)}</Text>;
  }
  const coloursOf = (read: () => Record<string, string>) => {
    renderWithProviders(<Probe read={read} />);
    return JSON.parse(String(screen.getByTestId('probe').props.children)) as Record<string, string>;
  };

  it('gives every shared status tone a colour', () => {
    const colours = coloursOf(useToneColors);
    expect(Object.keys(colours).sort()).toEqual(['default', 'error', 'info', 'success', 'warning']);
    for (const colour of Object.values(colours)) expect(typeof colour).toBe('string');
  });

  it('gives every trend series a line colour', () => {
    const colours = coloursOf(useTrendPalette);
    expect(Object.keys(colours).sort()).toEqual(['info', 'primary', 'success', 'warning']);
    for (const colour of Object.values(colours)) expect(typeof colour).toBe('string');
  });
});
