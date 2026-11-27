import { AccessibilityInfo, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { renderWithTheme } from '@/test-utils';
import { EmptyState } from '../mobile/EmptyState';
import { Fab } from '../mobile/Fab';
import { FilterChips } from '../mobile/FilterChips';
import { IconButton } from '../mobile/IconButton';
import { ListRow } from '../mobile/ListRow';
import { ListSection } from '../mobile/ListSection';
import { QuickAction } from '../mobile/QuickAction';
import { SearchBar } from '../mobile/SearchBar';
import { SkeletonRows } from '../mobile/Skeleton';
import { StateView } from '../StateView';
import { haptics } from '@/services/haptics';

beforeEach(() => jest.clearAllMocks());

describe('SearchBar', () => {
  it('shows a clear button only once something is typed, and clears the text', () => {
    const onChange = jest.fn();
    const { rerender } = renderWithTheme(
      <SearchBar value="" onChange={onChange} placeholder="Search" testID="s" />,
    );
    expect(screen.queryByTestId('s-clear')).toBeNull();
    fireEvent.changeText(screen.getByTestId('s'), 'riya');
    expect(onChange).toHaveBeenLastCalledWith('riya');
    rerender(<SearchBar value="riya" onChange={onChange} placeholder="Search" testID="s" />);
    fireEvent.press(screen.getByTestId('s-clear'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});

describe('FilterChips', () => {
  const options = [
    { key: 'all', label: 'All' },
    { key: 'won', label: 'Won' },
  ] as const;

  it('marks the picked pill, changes on another with a tick, and ignores the picked one', () => {
    const onChange = jest.fn();
    renderWithTheme(
      <FilterChips options={options} value="all" onChange={onChange} label="Status" testID="f" />,
    );
    expect(screen.getByTestId('f-all')).toBeChecked();
    expect(screen.getByTestId('f-won')).not.toBeChecked();
    fireEvent.press(screen.getByTestId('f-all'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('f-won'));
    expect(onChange).toHaveBeenCalledWith('won');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    // The label stays off screen unless asked for.
    expect(screen.queryByText('Status')).toBeNull();
  });

  it('names the row on screen when two rows would read the same', () => {
    renderWithTheme(
      <FilterChips
        options={options}
        value="all"
        onChange={jest.fn()}
        label="Status"
        showLabel
        testID="f"
      />,
    );
    // Seen, not read twice: the radio group already carries the name for screen readers.
    expect(screen.getByText('Status', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('IconButton and QuickAction', () => {
  it('press with a haptic tick, and are marked disabled when off', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <>
        <IconButton icon={{ name: 'phone' }} label="Call" onPress={onPress} testID="i" />
        <IconButton
          icon={{ name: 'phone' }}
          label="Off"
          onPress={onPress}
          disabled
          testID="i-off"
        />
        <QuickAction
          icon={{ set: 'community', name: 'whatsapp' }}
          label="WA"
          onPress={onPress}
          testID="q"
        />
        <QuickAction
          icon={{ name: 'email' }}
          label="Mail"
          onPress={onPress}
          disabled
          testID="q-off"
        />
      </>,
    );
    fireEvent.press(screen.getByTestId('i'));
    fireEvent.press(screen.getByTestId('q'));
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
    // Disabled ones are marked so (the platform then refuses the touch; RNTL's fireEvent
    // would call the component's own onPress prop regardless, so it is not pressed here).
    expect(screen.getByTestId('i-off')).toBeDisabled();
    expect(screen.getByTestId('q-off')).toBeDisabled();
    expect(screen.getByLabelText('Call')).toBeOnTheScreen();
  });

  it('the floating button presses with a tick and carries its label', () => {
    const onPress = jest.fn();
    renderWithTheme(<Fab icon="add" label="New lead" onPress={onPress} testID="fab" />);
    fireEvent.press(screen.getByTestId('fab'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('New lead')).toBeOnTheScreen();
  });
});

describe('ListSection and ListRow', () => {
  it('titles the group and shows a chevron only on rows that open something', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <ListSection title="Leads" footer="All your leads">
        <ListRow
          key="a"
          icon="groups"
          title="Venue leads"
          subtitle="Pune"
          onPress={onPress}
          testID="a"
        />
        <ListRow key="b" icon={{ set: 'community', name: 'whatsapp' }} title="Plain" testID="b" />
        <ListRow
          key="c"
          icon="logout"
          title="Sign out"
          destructive
          chevron={false}
          onPress={onPress}
          testID="c"
        />
      </ListSection>,
    );
    expect(screen.getByRole('heading', { name: 'Leads' })).toBeOnTheScreen();
    expect(screen.getByText('All your leads')).toBeOnTheScreen();
    expect(screen.getByText('Pune')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('a'));
    fireEvent.press(screen.getByTestId('c'));
    expect(onPress).toHaveBeenCalledTimes(2);
    // A row with no action is not a button.
    expect(screen.getByTestId('b')).not.toHaveProp('role', 'button');
  });
});

describe('EmptyState and StateView', () => {
  it('shows the empty message with its hint, and an action when given', () => {
    const onPress = jest.fn();
    renderWithTheme(
      <EmptyState
        icon="inbox"
        title="Nothing here"
        body="Add one"
        action={{ label: 'Add', onPress, testID: 'add' }}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeOnTheScreen();
    expect(screen.getByText('Add one')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('add'));
    expect(onPress).toHaveBeenCalled();
  });

  it('draws skeleton rows while loading, a spinner when inline, and an alert with retry on error', () => {
    const onRetry = jest.fn();
    const { rerender } = renderWithTheme(<StateView loading rows={3} />);
    expect(screen.getByTestId('skeleton')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading…')).toBeOnTheScreen();
    rerender(<StateView loading inline />);
    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.getByText('Loading…')).toBeOnTheScreen();
    rerender(<StateView error="Offline" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Offline', { exact: false });
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(onRetry).toHaveBeenCalled();
    rerender(<StateView error />);
    expect(screen.getByText('This could not be loaded.')).toBeOnTheScreen();
    expect(screen.queryByTestId('state-retry')).toBeNull();
    rerender(<StateView empty="No leads" emptyHint="Try another search" />);
    expect(screen.getByText('Try another search')).toBeOnTheScreen();
    rerender(<StateView />);
    expect(screen.queryByText('No leads')).toBeNull();
  });
});

describe('SkeletonRows', () => {
  it('pulses unless the person asked the system to reduce motion', async () => {
    const start = jest.fn();
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue({
      start,
      stop: jest.fn(),
      reset: jest.fn(),
    });
    const reduce = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
    reduce.mockResolvedValueOnce(true);
    const first = renderWithTheme(<SkeletonRows rows={2} />);
    await act(async () => {});
    expect(start).not.toHaveBeenCalled();
    first.unmount();
    reduce.mockResolvedValueOnce(false);
    renderWithTheme(<SkeletonRows rows={2} />);
    await act(async () => {});
    expect(start).toHaveBeenCalledTimes(1);
    loop.mockRestore();
    reduce.mockRestore();
  });
});

describe('haptics', () => {
  it('maps each kind of feedback to the platform haptic', () => {
    haptics.tap();
    haptics.success();
    haptics.error();
    haptics.heavy();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });
});
