import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { AiPrompt } from '@duncit/ai-prompts';
import { ReelChatForm } from '../../src/forms/reel-chat';
import { ReelProjectForm } from '../../src/forms/reel-project';
import { ReelPromptForm } from '../../src/forms/reel-prompt';
import type { SavedPrompts } from '../../src/pages/reels/studio/chat/useSavedPrompts';
import { renderWithProviders } from '../testkit';

/**
 * The media picker, as three buttons. The real one uploads to ImageKit; what the
 * composer does with the addresses it is handed back is what is under test.
 */
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  default: ({
    open,
    max,
    onClose,
    onPicked,
    onPickedMany,
  }: {
    open: boolean;
    max: number;
    onClose: () => void;
    onPicked: (url: string) => void;
    onPickedMany: (urls: string[]) => void;
  }) =>
    open ? (
      <div data-testid="media-picker" data-max={max}>
        <button type="button" onClick={() => onPicked('https://ik.imagekit.io/duncit/ai/reels/poster.png')}>pick one</button>
        <button
          type="button"
          onClick={() => onPickedMany(Array.from({ length: 8 }, (_item, index) => `https://ik.imagekit.io/duncit/ai/reels/${index}.png`))}
        >
          pick eight
        </button>
        <button type="button" onClick={onClose}>
          close picker
        </button>
      </div>
    ) : null,
}));

const FOLDER_URL = 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp';

const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });

/** Wait for react-hook-form's validation, which settles a tick after the change. */
const enabled = (testId: string) => waitFor(() => expect(screen.getByTestId(testId)).toBeEnabled());
const disabled = (testId: string) => waitFor(() => expect(screen.getByTestId(testId)).toBeDisabled());

describe('ReelProjectForm', () => {
  it('stays shut until it is opened', () => {
    renderWithProviders(<ReelProjectForm open={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('reel-project-form')).not.toBeInTheDocument();
  });

  it('creates a reel once it has a name', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReelProjectForm open onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reel-project-submit')).toBeDisabled();

    type('reel-project-name', 'Jam night recap');
    await enabled('reel-project-submit');
    fireEvent.submit(screen.getByTestId('reel-project-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Jam night recap', drive_url: '' }));
  });

  it('refuses a link that is not a Drive folder while the dialog is still open', async () => {
    renderWithProviders(<ReelProjectForm open onClose={vi.fn()} onSubmit={vi.fn()} />);
    type('reel-project-name', 'Jam night recap');
    type('reel-project-drive-url', 'https://example.com/shoot');
    await disabled('reel-project-submit');
    expect(screen.getByTestId('reel-project-drive-url')).toHaveAttribute('aria-invalid', 'true');

    type('reel-project-drive-url', FOLDER_URL);
    await enabled('reel-project-submit');
    expect(screen.getByTestId('reel-project-drive-url')).toHaveAttribute('aria-invalid', 'false');
  });

  it('reopens on the reel’s own details, to rename it or change its folder', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    // Every render of the parent hands the dialog a NEW object holding the same details.
    function Parent() {
      const [renders, setRenders] = useState(0);
      return (
        <>
          <button type="button" data-testid="parent-rerender" onClick={() => setRenders(renders + 1)}>
            {renders}
          </button>
          <ReelProjectForm open initialValues={{ name: 'Jam night recap', drive_url: FOLDER_URL }} onClose={onClose} onSubmit={onSubmit} />
        </>
      );
    }
    renderWithProviders(<Parent />);
    expect(screen.getByTestId('reel-project-name')).toHaveValue('Jam night recap');
    expect(screen.getByTestId('reel-project-drive-url')).toHaveValue(FOLDER_URL);

    type('reel-project-name', 'Final cut');
    await enabled('reel-project-submit');
    fireEvent.submit(screen.getByTestId('reel-project-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Final cut', drive_url: FOLDER_URL }));

    fireEvent.click(screen.getByTestId('reel-project-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // A new object with the same contents must not wipe what is being typed.
    fireEvent.click(screen.getByTestId('parent-rerender'));
    expect(screen.getByTestId('reel-project-name')).toHaveValue('Final cut');
  });
});

describe('ReelPromptForm', () => {
  it('opens on the words in the composer and saves them under a name', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<ReelPromptForm open content="cut a 15 second teaser" onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByTestId('reel-prompt-content')).toHaveValue('cut a 15 second teaser');
    expect(screen.getByTestId('reel-prompt-submit')).toBeDisabled();

    type('reel-prompt-name', 'Teaser');
    await enabled('reel-prompt-submit');
    fireEvent.submit(screen.getByTestId('reel-prompt-form'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Teaser', content: 'cut a 15 second teaser' }));

    fireEvent.click(screen.getByTestId('reel-prompt-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays shut until it is opened', () => {
    renderWithProviders(<ReelPromptForm open={false} content="" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('reel-prompt-form')).not.toBeInTheDocument();
  });
});

describe('ReelChatForm', () => {
  const prompt = { id: 'p1', name: 'Teaser', content: 'cut a 15 second teaser with captions' } as AiPrompt;
  let savedPrompts: SavedPrompts;
  let onSend: ReturnType<typeof vi.fn<(text: string, imageUrls: string[]) => Promise<boolean>>>;

  const mount = (busy = false) =>
    renderWithProviders(<ReelChatForm busy={busy} savedPrompts={savedPrompts} onSend={onSend} />);

  beforeEach(() => {
    onSend = vi.fn(async () => true);
    savedPrompts = { prompts: [prompt], saving: false, save: vi.fn(async () => true), remove: vi.fn(async () => undefined) };
  });

  it('sends the request and clears the composer', async () => {
    mount();
    expect(screen.getByTestId('reel-chat-send')).toBeDisabled();
    type('reel-chat-text', 'open on the drums');
    await enabled('reel-chat-send');
    fireEvent.click(screen.getByTestId('reel-chat-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('open on the drums', []));
    await waitFor(() => expect(screen.getByTestId('reel-chat-text')).toHaveValue(''));
  });

  it('keeps what was written when the turn did not go through', async () => {
    onSend.mockResolvedValue(false);
    mount();
    type('reel-chat-text', 'open on the drums');
    await enabled('reel-chat-send');
    fireEvent.submit(screen.getByTestId('reel-chat-form'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('reel-chat-text')).toHaveValue('open on the drums');
  });

  it('sends on Enter, and breaks the line on Shift+Enter or mid-composition', async () => {
    mount();
    type('reel-chat-text', 'open on the drums');
    await enabled('reel-chat-send');
    const box = screen.getByTestId('reel-chat-text');

    fireEvent.keyDown(box, { key: 'a' });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('open on the drums', []));
  });

  it('holds while a turn is already with the editor, however send is reached', async () => {
    mount(true);
    type('reel-chat-text', 'and add captions');
    await waitFor(() => expect(screen.getByTestId('reel-chat-save-prompt')).toBeEnabled());
    fireEvent.keyDown(screen.getByTestId('reel-chat-text'), { key: 'Enter' });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('reel-chat-form'));
    });
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByTestId('reel-chat-attach')).toBeDisabled();
    expect(screen.getByTestId('reel-prompts-open')).toBeDisabled();
  });

  it('attaches pictures once each, up to six, and sends them with the request', async () => {
    mount();
    fireEvent.click(screen.getByTestId('reel-chat-attach'));
    expect(screen.getByTestId('media-picker').dataset.max).toBe('6');
    fireEvent.click(screen.getByText('pick one'));
    fireEvent.click(screen.getByText('pick one'));
    expect(screen.getAllByTestId(/^reel-chat-attachment-/)).toHaveLength(1);
    expect(screen.getByTestId('media-picker').dataset.max).toBe('5');

    fireEvent.click(screen.getByText('pick eight'));
    expect(screen.getAllByTestId(/^reel-chat-attachment-/)).toHaveLength(6);
    // Full: the picker would be offered room for one, and the button is off.
    expect(screen.getByTestId('media-picker').dataset.max).toBe('1');
    expect(screen.getByTestId('reel-chat-attach')).toBeDisabled();
    fireEvent.click(screen.getByText('close picker'));
    expect(screen.queryByTestId('media-picker')).not.toBeInTheDocument();

    // Take the first one off again.
    fireEvent.click(screen.getByTestId('reel-chat-attachment-1').querySelector('button')!);
    expect(screen.getAllByTestId(/^reel-chat-attachment-/)).toHaveLength(5);

    type('reel-chat-text', 'use these');
    await enabled('reel-chat-send');
    fireEvent.click(screen.getByTestId('reel-chat-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onSend.mock.calls[0][1]).toHaveLength(5);
    await waitFor(() => expect(screen.queryByTestId(/^reel-chat-attachment-/)).not.toBeInTheDocument());
  });

  it('fills the composer from a saved request without sending it', async () => {
    mount();
    fireEvent.click(screen.getByTestId('reel-prompts-open'));
    fireEvent.click(await screen.findByTestId('reel-prompt-use-p1'));
    await waitFor(() => expect(screen.getByTestId('reel-chat-text')).toHaveValue(prompt.content));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('deletes a saved request from the list', async () => {
    mount();
    fireEvent.click(screen.getByTestId('reel-prompts-open'));
    fireEvent.click(await screen.findByTestId('reel-prompt-delete-p1'));
    expect(savedPrompts.remove).toHaveBeenCalledWith(prompt);
  });

  it('says so when nothing has been saved yet', async () => {
    savedPrompts = { ...savedPrompts, prompts: [] };
    mount();
    fireEvent.click(screen.getByTestId('reel-prompts-open'));
    expect(await screen.findByTestId('reel-prompts-empty')).toBeInTheDocument();
  });

  it('saves what is in the composer as a prompt, and closes only once it is saved', async () => {
    vi.mocked(savedPrompts.save).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    expect(screen.getByTestId('reel-chat-save-prompt')).toBeDisabled();
    type('reel-chat-text', 'cut a teaser');
    await waitFor(() => expect(screen.getByTestId('reel-chat-save-prompt')).toBeEnabled());
    fireEvent.click(screen.getByTestId('reel-chat-save-prompt'));
    expect(await screen.findByTestId('reel-prompt-content')).toHaveValue('cut a teaser');

    type('reel-prompt-name', 'Teaser');
    await enabled('reel-prompt-submit');
    fireEvent.submit(screen.getByTestId('reel-prompt-form'));
    await waitFor(() => expect(savedPrompts.save).toHaveBeenCalledWith({ name: 'Teaser', content: 'cut a teaser' }));
    // Refused: the dialog stays open on what was typed.
    expect(screen.getByTestId('reel-prompt-form')).toBeInTheDocument();
    // Saving a prompt is not sending a message.
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.submit(screen.getByTestId('reel-prompt-form'));
    await waitFor(() => expect(screen.queryByTestId('reel-prompt-form')).not.toBeInTheDocument());

    // Reopened and dismissed without saving.
    fireEvent.click(screen.getByTestId('reel-chat-save-prompt'));
    fireEvent.click(await screen.findByTestId('reel-prompt-cancel'));
    await waitFor(() => expect(screen.queryByTestId('reel-prompt-form')).not.toBeInTheDocument());
    expect(savedPrompts.save).toHaveBeenCalledTimes(2);
  });
});
