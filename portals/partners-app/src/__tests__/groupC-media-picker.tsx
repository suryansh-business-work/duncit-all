/**
 * A stand-in for `@duncit/media-picker`'s dialog.
 *
 * The real picker uploads to ImageKit and searches Pexels — that package has
 * its own suite. A page only cares about the two things it hands the picker:
 * what happens when a file comes back, and what happens when it is dismissed.
 * This renders the props it was opened with and one button for each.
 *
 * Use it with
 *   vi.mock('<rel>/components/MediaPickerDialog', () => import('<rel>/__tests__/groupC-media-picker'))
 */
import type { MediaPickerDialogProps } from '@duncit/media-picker';

export const PICKED_MEDIA_URL = 'https://ik.imagekit.io/duncit/pods/court-cover.jpg';

export default function MediaPickerStub({ open, onClose, onPicked, folder, title, accept }: Readonly<MediaPickerDialogProps>) {
  return (
    <div data-testid="media-picker">
      {open && (
        <section aria-label="Media picker" data-folder={folder} data-accept={accept}>
          <h2>{title}</h2>
          <button type="button" onClick={() => onPicked(PICKED_MEDIA_URL)}>
            Choose media
          </button>
          <button type="button" onClick={onClose}>
            Dismiss picker
          </button>
        </section>
      )}
    </div>
  );
}
