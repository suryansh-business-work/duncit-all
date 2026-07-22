import { fireEvent, screen } from '@testing-library/react-native';

import { ChatParticipantsPanel } from '@/components/chat/ChatParticipantsPanel';
import type { ChatPerson } from '@/hooks/useChat';
import { renderWithProviders } from '@/utils/test-utils';

const person = (id: string, over: Partial<ChatPerson> = {}): ChatPerson =>
  ({ user_id: id, full_name: `User ${id}`, profile_photo: null, ...over }) as ChatPerson;

describe('ChatParticipantsPanel', () => {
  it('renders nothing when there are no people', () => {
    renderWithProviders(
      <ChatParticipantsPanel hosts={[]} participants={[]} count={0} onOpenProfile={jest.fn()} />,
    );
    expect(screen.queryByTestId('chat-participants')).toBeNull();
  });

  it('falls back to a "U" avatar and singular count for a nameless lone participant', () => {
    renderWithProviders(
      <ChatParticipantsPanel
        hosts={[]}
        participants={[person('u1', { full_name: '' })]}
        count={1}
        onOpenProfile={jest.fn()}
      />,
    );
    expect(screen.getByText('1 participant')).toBeOnTheScreen();
    expect(screen.getByText('U')).toBeOnTheScreen();
  });

  it('shows hosts (with a badge + initial) and participants (with a photo), plural count', () => {
    const onOpenProfile = jest.fn();
    renderWithProviders(
      <ChatParticipantsPanel
        hosts={[person('h1', { full_name: 'Asha Host' })]}
        participants={[person('u2', { full_name: 'Ben', profile_photo: 'ben.jpg' })]}
        count={3}
        onOpenProfile={onOpenProfile}
      />,
    );
    expect(screen.getByText('3 participants')).toBeOnTheScreen();
    expect(screen.getByText('Host')).toBeOnTheScreen();
    expect(screen.getByText('A')).toBeOnTheScreen(); // initial fallback for the photo-less host
    fireEvent.press(screen.getByTestId('chat-person-h1'));
    fireEvent.press(screen.getByTestId('chat-person-u2'));
    expect(onOpenProfile).toHaveBeenCalledWith('h1');
    expect(onOpenProfile).toHaveBeenCalledWith('u2');
  });
});
