import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessageText from '../MessageText';
import MessageQuote from '../MessageQuote';

const asha = { user_id: 'u1', full_name: 'Asha Rao' };

describe('MessageText', () => {
  it('links a recorded mention to that profile', () => {
    const onOpenProfile = vi.fn();
    render(<MessageText text="see you @Asha!" mine={false} mentioned={[asha]} onOpenProfile={onOpenProfile} />);
    const link = screen.getByRole('button', { name: 'Open the profile of Asha Rao' });
    expect(link).toHaveTextContent('@Asha');
    fireEvent.click(link);
    expect(onOpenProfile).toHaveBeenCalledWith('u1');
  });

  it('keeps an @word that named nobody as plain text', () => {
    render(<MessageText text="email me @home" mine mentioned={[asha]} onOpenProfile={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('email me @home')).toBeInTheDocument();
  });
});

describe('MessageQuote', () => {
  it('quotes the answered line and jumps to it', () => {
    const onJump = vi.fn();
    render(
      <MessageQuote
        quote={{ id: 'm9', user_name: 'Ravi', text: 'Meet at 7?', type: 'TEXT', deleted: false }}
        mine={false}
        onJump={onJump}
      />
    );
    const quote = screen.getByRole('button', { name: 'Show the original message from Ravi' });
    expect(quote).toHaveTextContent('Meet at 7?');
    fireEvent.click(quote);
    expect(onJump).toHaveBeenCalledWith('m9');
  });

  it('says the original was deleted instead of quoting it', () => {
    render(
      <MessageQuote
        quote={{ id: 'm9', user_name: 'Ravi', text: '', type: 'TEXT', deleted: true }}
        mine
        onJump={vi.fn()}
      />
    );
    expect(screen.getByText('This message was deleted')).toBeInTheDocument();
  });
});
