import { useRef, useState } from 'react';

/** Bridges the URL-callback media picker to the club form's promise picker.
 * The folder travels with the request, so club moments never land in /clubs. */
export default function useClubImagePicker() {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState('/clubs');
  const resolveRef = useRef<((url: string | null) => void) | null>(null);

  const pickImage = (nextFolder = '/clubs') =>
    new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
      setFolder(nextFolder);
      setOpen(true);
    });

  const settle = (url: string | null) => {
    resolveRef.current?.(url);
    resolveRef.current = null;
    setOpen(false);
  };

  return { open, folder, pickImage, settle };
}
