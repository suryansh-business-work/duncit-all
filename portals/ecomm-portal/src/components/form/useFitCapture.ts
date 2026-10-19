import { useRef, useState, type FormEvent } from 'react';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { fitImage, type ImageFit } from '../../lib/image-fit';

/**
 * Resizes a picture picked in a `SingleImageUploadField` before the field
 * uploads it.
 *
 * The shared field has no hook between "file picked" and "upload", so this
 * listens in the CAPTURE phase on a wrapper around it: the picked file is held
 * back from the field, fitted, put back on the same file input and the change
 * replayed — the field then uploads the fitted file with its own size cap,
 * progress and error handling. The replay is let through untouched.
 */
export function useFitCapture(fit: Readonly<ImageFit> | undefined) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const replaying = useRef(false);

  const replay = async (input: HTMLInputElement, file: File, target: Readonly<ImageFit>) => {
    try {
      const fitted = await fitImage(file, target);
      const transfer = new DataTransfer();
      transfer.items.add(fitted);
      input.files = transfer.files;
      replaying.current = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error_) {
      logs.portal['ecomm-portal'].warn('image-fit', 'useFitCapture', { error: error_, type: file.type, size: file.size });
      setError(t('ecommPortal.form.imageFitFailed'));
    } finally {
      replaying.current = false;
    }
  };

  const onChangeCapture = (event: FormEvent<HTMLElement>) => {
    const input = event.target;
    if (!fit || replaying.current || !(input instanceof HTMLInputElement)) return;
    // A pasted or edited URL replaces the picture that could not be read.
    setError(null);
    const file = input.type === 'file' ? input.files?.[0] : undefined;
    if (!file) return;
    event.stopPropagation();
    fireAndForget(replay(input, file, fit), logs.portal['ecomm-portal'], 'image-fit', 'useFitCapture');
  };

  return { error, onChangeCapture };
}
