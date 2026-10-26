/**
 * A deterministic stand-in for @duncit/media-picker's MediaPickerDialog. The real
 * picker needs a router (its tabs live in the URL), ImageKit and the device's
 * files; this one renders only while open, says what it was asked for (accept,
 * device-only, folder, title) and ends a pick the way the real one does:
 * `onPicked(url)` then `onClose()`.
 *
 * Use from a test file:
 *   vi.mock('@duncit/media-picker', async () => ({ MediaPickerDialog: (await import('./media-picker-stub')).MediaPickerStub }));
 * and queue the photos the next picks hand back with `nextPicks.push(url)`.
 */
interface StubProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  accept?: string;
  deviceOnly?: boolean;
  folder?: string;
  title?: string;
}

/** What the next picks hand back, in order (the test fills it); once empty, `DEFAULT_PICK`. */
export const nextPicks: string[] = [];

export const DEFAULT_PICK = 'https://ik.imagekit.io/duncit/chat/picked.jpg';

export function MediaPickerStub({ open, onClose, onPicked, accept, deviceOnly, folder, title }: Readonly<StubProps>) {
  if (!open) return null;
  const pick = () => {
    onPicked(nextPicks.shift() ?? DEFAULT_PICK);
    onClose();
  };
  return (
    <div role="dialog" aria-label={title} data-accept={accept} data-device-only={String(deviceOnly)} data-folder={folder}>
      <button type="button" onClick={pick}>
        Pick photo
      </button>
      <button type="button" onClick={onClose}>
        Close picker
      </button>
    </div>
  );
}
