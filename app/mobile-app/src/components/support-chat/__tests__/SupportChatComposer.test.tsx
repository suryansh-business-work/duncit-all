import { fireEvent, screen } from '@testing-library/react-native';

import { SupportChatComposer } from '@/components/support-chat/SupportChatComposer';
import { renderWithProviders } from '@/utils/test-utils';

const baseProps = {
  onSendText: jest.fn(),
  onAttach: jest.fn(),
  onAttachDocument: jest.fn(),
  onTyping: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('SupportChatComposer', () => {
  it('renders nothing once the chat is locked', () => {
    renderWithProviders(<SupportChatComposer {...baseProps} locked />);
    expect(screen.queryByTestId('support-chat-input')).toBeNull();
  });

  it('shows no preview and ignores an empty send when there are no attachments', () => {
    const onSendText = jest.fn();
    renderWithProviders(<SupportChatComposer {...baseProps} onSendText={onSendText} />);
    expect(screen.queryByTestId('support-chat-attach-preview-0')).toBeNull();

    // Empty input + no attachments → send is a no-op.
    fireEvent.press(screen.getByTestId('support-chat-send'));
    expect(onSendText).not.toHaveBeenCalled();

    // Typing then sending forwards the trimmed body.
    fireEvent.changeText(screen.getByTestId('support-chat-input'), '  hi  ');
    fireEvent.press(screen.getByTestId('support-chat-send'));
    expect(onSendText).toHaveBeenCalledWith('hi');
  });

  it('previews staged attachments, removes one, and sends attachment-only', () => {
    const onRemoveAttachment = jest.fn();
    const onSendText = jest.fn();
    renderWithProviders(
      <SupportChatComposer
        {...baseProps}
        onSendText={onSendText}
        attachments={['https://ik/report.pdf', 'https://ik/clip.mp4']}
        onRemoveAttachment={onRemoveAttachment}
      />,
    );
    expect(screen.getByTestId('support-chat-attach-preview-0')).toBeOnTheScreen();
    expect(screen.getByTestId('support-chat-attach-preview-1')).toBeOnTheScreen();
    expect(screen.getByText('report.pdf')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('support-chat-attach-remove-1'));
    expect(onRemoveAttachment).toHaveBeenCalledWith('https://ik/clip.mp4');

    // Sending with attachments but no typed text forwards an empty body.
    fireEvent.press(screen.getByTestId('support-chat-send'));
    expect(onSendText).toHaveBeenCalledWith('');
  });

  it('no-ops the remove press when no handler is supplied', () => {
    renderWithProviders(
      <SupportChatComposer {...baseProps} attachments={['https://ik/only.png']} />,
    );
    // Pressing remove without an onRemoveAttachment handler must not throw.
    expect(() => fireEvent.press(screen.getByTestId('support-chat-attach-remove-0'))).not.toThrow();
  });
});
