import { StyleSheet } from 'react-native';
import { screen } from '@testing-library/react-native';

import { AskDuncitScreen } from '@/screens/AskDuncitScreen';
import { useAskDuncit } from '@/hooks/useAskDuncit';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ setParams: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn().mockResolvedValue({}) }));
jest.mock('@/hooks/useAskDuncit', () => ({ useAskDuncit: jest.fn() }));
jest.mock('@/hooks/useAskDuncitVoice', () => ({
  useAskDuncitVoice: () => ({
    speakingId: null,
    recording: false,
    transcribing: false,
    speak: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));
jest.mock('@/hooks/useKeyboardInset', () => ({ useKeyboardInset: jest.fn(() => 0) }));

const bootstrap = {
  role_key: 'MEMBER',
  available: true,
  unavailable_reason: null,
  alerts: [],
  suggestions: [],
  features: {
    chat_history: false,
    handover: false,
    rollback: false,
    voice: false,
    uploads: false,
    memory: false,
  },
  limits: { max_input_chars: 2000, max_attachments: 0 },
};

function mockAssistant() {
  jest.mocked(useAskDuncit).mockReturnValue({
    bootstrap,
    bootstrapError: null,
    thread: { messages: [], hasMore: false, streamingId: null, conversationId: null },
    loading: false,
    loadError: null,
    sending: false,
    errorText: null,
    handingOver: false,
    send: jest.fn(),
    stop: jest.fn(),
    decide: jest.fn(),
    rollback: jest.fn(),
    rate: jest.fn(),
    loadOlder: jest.fn(),
    handover: jest.fn(),
    clearError: jest.fn(),
    retryBootstrap: jest.fn(),
  } as unknown as ReturnType<typeof useAskDuncit>);
}

/** The bottom padding of the nearest view wrapping the whole conversation (composer included). */
function liftAbove(testID: string): number | undefined {
  let node = screen.getByTestId(testID).parent;
  while (node) {
    const padding = StyleSheet.flatten(node.props.style)?.paddingBottom;
    if (typeof padding === 'number' && padding > 0) return padding;
    node = node.parent;
  }
  return undefined;
}

describe('AskDuncitScreen', () => {
  beforeEach(() => mockAssistant());

  it('shows the assistant as an experimental Beta, with what that means', () => {
    renderWithProviders(<AskDuncitScreen />);
    expect(screen.getByTestId('ask-duncit-beta')).toHaveTextContent('Beta');
    expect(screen.getByTestId('ask-duncit-beta-hint')).toHaveTextContent(/experimental/i);
  });

  it('lifts the composer by the keyboard height so the input is never behind the keyboard', () => {
    jest.mocked(useKeyboardInset).mockReturnValue(312);
    renderWithProviders(<AskDuncitScreen />);
    expect(screen.getByTestId('ask-duncit-input')).toBeTruthy();
    expect(liftAbove('ask-duncit-screen')).toBe(312);
  });

  it('adds no lift while the keyboard is closed', () => {
    jest.mocked(useKeyboardInset).mockReturnValue(0);
    renderWithProviders(<AskDuncitScreen />);
    expect(liftAbove('ask-duncit-screen')).toBeUndefined();
  });
});
