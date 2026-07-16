import { useRef, useState } from 'react';
import { parseApiError } from '@duncit/utils';
import { useImagekitBase64Upload } from '../upload';

interface Args {
  folder: string;
  maxBytes: number | null;
  oversizeMessage?: (file: File) => string;
  fallbackMimeType?: string;
  onChange: (url: string) => void;
}

function defaultOversizeMessage(file: File, maxBytes: number): string {
  const mb = Math.round(maxBytes / (1024 * 1024));
  return `${file.name} is too large (max ${mb} MB)`;
}

/** Shared pick-file → size-gate → ImageKit → onChange(url) state machine. */
export function useSingleImageUpload({
  folder,
  maxBytes,
  oversizeMessage,
  fallbackMimeType,
  onChange,
}: Readonly<Args>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { upload, uploading: busy } = useImagekitBase64Upload();
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => inputRef.current?.click();

  const onFile = async (file: File | null) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setError(null);
    if (maxBytes != null && file.size > maxBytes) {
      const message = oversizeMessage
        ? oversizeMessage(file)
        : defaultOversizeMessage(file, maxBytes);
      setError(message);
      return;
    }
    try {
      const { url } = await upload(file, { folder, fallbackMimeType });
      onChange(url);
    } catch (e) {
      setError(parseApiError(e, 'Upload failed'));
    }
  };

  return { inputRef, busy, error, setError, openPicker, onFile };
}
