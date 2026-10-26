import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, createEvent, fireEvent, screen, waitFor } from '@testing-library/react';
import ChatComposerForm from '.';
import { VENUE_CHAT_TEXT_MAX } from '../queries';
import { renderWithProviders } from '../../../__tests__/render';

afterEach(cleanup);

const mount = (onSend: (text: string) => Promise<boolean>, sending = false) =>
  renderWithProviders(<ChatComposerForm sending={sending} onSend={onSend} />);

const box = () => screen.getByRole('textbox', { name: 'Message' }) as HTMLTextAreaElement;
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const FAILED = 'Could not send your message.';

describe('ChatComposerForm', () => {
  it('sends the trimmed line when Send is pressed and clears the box once it is posted', async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend);
    type('  Is the terrace free?  ');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(box().value).toBe(''));
    expect(onSend).toHaveBeenCalledWith('Is the terrace free?');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sends on Enter', async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend);
    type('See you at 7');
    fireEvent.keyDown(box(), { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('See you at 7'));
  });

  it('keeps the draft and says the message did not go when the send is refused', async () => {
    mount(vi.fn().mockResolvedValue(false));
    type('See you at 7');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect((await screen.findByRole('alert')).textContent).toBe(FAILED);
    expect(box().value).toBe('See you at 7');
  });

  it('says the message did not go when the send throws, on Enter and on the button alike', async () => {
    mount(vi.fn().mockRejectedValue(new Error('offline')));
    type('One');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect((await screen.findByRole('alert')).textContent).toBe(FAILED);
    cleanup();

    mount(vi.fn().mockRejectedValue(new Error('offline')));
    type('Two');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect((await screen.findByRole('alert')).textContent).toBe(FAILED);
  });

  it('clears an earlier failure notice when the next send goes through', async () => {
    const onSend = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount(onSend);
    type('First');
    fireEvent.keyDown(box(), { key: 'Enter' });
    await screen.findByRole('alert');
    fireEvent.keyDown(box(), { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(box().value).toBe('');
  });

  it('breaks the line on Shift+Enter instead of sending', () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend);
    type('Line one');
    fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send on the Enter that confirms an input-method composition', () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend);
    type('にほん');
    const event = createEvent.keyDown(box(), { key: 'Enter' });
    Object.defineProperty(event, 'isComposing', { value: true });
    fireEvent(box(), event);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('ignores other keys', () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend);
    type('Hello');
    fireEvent.keyDown(box(), { key: 'a' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows Sending…, disables the button, and ignores Enter while a send is in flight', () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend, true);
    expect((screen.getByRole('button', { name: 'Sending…' }) as HTMLButtonElement).disabled).toBe(true);
    type('Hello');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('asks for something to say before sending an empty line', async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    mount(onSend);
    type('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Write a message first.')).toBeTruthy();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('caps the line at the server limit', () => {
    mount(vi.fn());
    expect(box().getAttribute('maxlength')).toBe(String(VENUE_CHAT_TEXT_MAX));
  });
});
