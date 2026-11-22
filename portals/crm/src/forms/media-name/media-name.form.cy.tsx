import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MediaNameForm, mediaNameSchema, MEDIA_NAME_MAX } from '.';

// Echoing keys keeps the schema's messages assertable without the bundle.
const schema = mediaNameSchema(((key: string) => key) as Parameters<typeof mediaNameSchema>[0]);
const messages = (name: string) => {
  const result = schema.safeParse({ name });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('mediaNameSchema', () => {
  it('trims a name and accepts it', () => {
    const result = schema.safeParse({ name: '  Dark logo  ' });
    expect(result.success && result.data.name).toBe('Dark logo');
  });

  it('asks for a name when blank or only spaces', () => {
    expect(messages('')).toEqual(['crm.media.nameRequired']);
    expect(messages('   ')).toEqual(['crm.media.nameRequired']);
  });

  it('accepts exactly the cap and refuses one character more', () => {
    expect(messages('a'.repeat(MEDIA_NAME_MAX))).toEqual([]);
    expect(messages('a'.repeat(MEDIA_NAME_MAX + 1))).toEqual(['crm.media.nameTooLong']);
  });
});

describe('MediaNameForm', () => {
  const setup = (props: Partial<Parameters<typeof MediaNameForm>[0]> = {}) => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<MediaNameForm open initialName="logo-final.png" onSubmit={onSubmit} onClose={onClose} {...props} />);
    return { onSubmit, onClose, input: () => screen.getByTestId('media-name-input') as HTMLInputElement };
  };

  it('prefills the current name and submits the trimmed new one', async () => {
    const { onSubmit, input } = setup();
    expect(input().value).toBe('logo-final.png');
    fireEvent.change(input(), { target: { value: '  Primary logo ' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Primary logo' });
  });

  it('refuses a blank name with a message and does not submit', async () => {
    const { onSubmit, input } = setup();
    fireEvent.change(input(), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('media-name-submit'));
    expect(await screen.findByText('Give the image a name')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server error it is given', () => {
    setup({ error: 'Image not found' });
    expect(screen.getByRole('alert')).toHaveTextContent('Image not found');
  });

  it('closes on Cancel, but not while a save is running', () => {
    const first = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(first.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Cancel while submitting', () => {
    setup({ submitting: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
