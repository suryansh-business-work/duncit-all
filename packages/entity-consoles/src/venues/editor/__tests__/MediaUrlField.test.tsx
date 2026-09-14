import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaUrlField from '../fields/MediaUrlField';
import { renderForm } from './harness';

/**
 * One stored URL that can be typed OR uploaded.
 *
 * The upload resolves through the shared media dialog; an admin who closes the
 * dialog without choosing must keep the URL they already had.
 */
interface Values {
  cover_image_url?: string;
}

const COVER = 'https://ik.imagekit.io/duncit/venues/third-wave.jpg';

const renderUrl = (defaults: Values, onPick: () => Promise<string | null>, hint?: string) =>
  renderForm<Values>(defaults, ({ control }) => (
    <MediaUrlField
      control={control}
      name="cover_image_url"
      label="Cover image"
      hint={hint}
      onPick={onPick}
      pickLabel="Upload"
    />
  ));

describe('MediaUrlField', () => {
  it('shows the stored URL with its hint, and takes a typed one', async () => {
    const user = userEvent.setup();
    const { form } = renderUrl({ cover_image_url: COVER }, vi.fn(), 'The first image a member sees.');

    const input = screen.getByRole('textbox', { name: 'Cover image' });
    expect(input).toHaveValue(COVER);
    expect(screen.getByText('The first image a member sees.')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'https://cdn.duncit.com/cover.png');
    await user.tab();

    expect(form().getValues('cover_image_url')).toBe('https://cdn.duncit.com/cover.png');
  });

  it('writes the uploaded URL', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn().mockResolvedValue(COVER);
    const { form } = renderUrl({}, onPick);

    expect(screen.getByRole('textbox', { name: 'Cover image' })).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(form().getValues('cover_image_url')).toBe(COVER));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('keeps the current URL when the dialog closes without a pick', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn().mockResolvedValue(null);
    const { form } = renderUrl({ cover_image_url: COVER }, onPick);

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
    expect(form().getValues('cover_image_url')).toBe(COVER);
  });

  it('shows the validation message instead of the hint', () => {
    const { form } = renderUrl({ cover_image_url: '' }, vi.fn(), 'Optional.');

    act(() => {
      form().setError('cover_image_url', { message: 'File or link is required' });
    });

    expect(screen.getByText('File or link is required')).toBeInTheDocument();
    expect(screen.queryByText('Optional.')).not.toBeInTheDocument();
  });
});
