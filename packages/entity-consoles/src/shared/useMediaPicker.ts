import { useRef, useState } from 'react';

/**
 * Bridges the URL-callback media picker to a form's promise picker.
 *
 * The folder travels with the request, so a club's moments never land in
 * `/clubs` and a venue's documents never land in its gallery. Shared by every
 * console editor that uploads anything (rule 34).
 */
export default function useMediaPicker(defaultFolder: string) {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState(defaultFolder);
  const resolveRef = useRef<((url: string | null) => void) | null>(null);

  const pickImage = (nextFolder = defaultFolder) =>
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
