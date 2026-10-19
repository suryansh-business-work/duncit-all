import { act, fireEvent, screen } from '@testing-library/react-native';
import { parseChatNewFrame, type ChatNewFrame } from '@duncit/utils';

import { ChatNewBanner } from '@/components/chat/ChatNewBanner';
import { openChatRoom } from '@/hooks/useChatAlerts';
import { useChatAlertsStore } from '@/stores/chat-alerts.store';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
let mockRoute: { name: string; params?: Record<string, string> } | undefined;
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    getCurrentRoute: () => mockRoute,
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));
// The socket side is useChatAlerts' job; the banner reads the store.
jest.mock('@/services/user-socket', () => ({ openUserSocket: () => Promise.resolve(null) }));

const frame = (over: Record<string, unknown> = {}) =>
  parseChatNewFrame({
    room_kind: 'CLUB',
    room_id: 'c1',
    message_id: 'm1',
    title: 'Runners',
    sender_name: 'Asha',
    preview: 'on my way',
    type: 'TEXT',
    mentioned: false,
    ...over,
  }) as ChatNewFrame;

beforeEach(() => {
  mockNavigate.mockClear();
  mockRoute = undefined;
  act(() => useChatAlertsStore.setState({ banner: null }));
});

describe('ChatNewBanner', () => {
  it('shows the room and the line, and opens the room on tap', () => {
    renderWithProviders(<ChatNewBanner />);
    act(() => useChatAlertsStore.getState().show(frame()));
    expect(screen.getByText('Runners')).toBeOnTheScreen();
    expect(screen.getByText('Asha: on my way')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Open: Runners'));
    expect(mockNavigate).toHaveBeenCalledWith('ChatRoom', { clubId: 'c1', title: 'Runners' });
    expect(screen.queryByTestId('chat-new-banner')).toBeNull();
  });

  it('can be dismissed without opening anything', () => {
    renderWithProviders(<ChatNewBanner />);
    act(() => useChatAlertsStore.getState().show(frame({ room_kind: 'POD', room_id: 'p1' })));
    fireEvent.press(screen.getByTestId('chat-new-banner-close'));
    expect(screen.queryByTestId('chat-new-banner')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides on its own after a few seconds', () => {
    jest.useFakeTimers();
    try {
      renderWithProviders(<ChatNewBanner />);
      act(() => useChatAlertsStore.getState().show(frame()));
      act(() => jest.advanceTimersByTime(5000));
      expect(screen.queryByTestId('chat-new-banner')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('openChatRoom', () => {
  it('reads the open pod or club room off the current route', () => {
    mockRoute = { name: 'ChatRoom', params: { podId: 'p1', title: 'x' } };
    expect(openChatRoom()).toEqual({ kind: 'POD', id: 'p1' });
    mockRoute = { name: 'ChatRoom', params: { clubId: 'c1', title: 'x' } };
    expect(openChatRoom()).toEqual({ kind: 'CLUB', id: 'c1' });
    mockRoute = { name: 'HomeTab' };
    expect(openChatRoom()).toBeNull();
  });
});
