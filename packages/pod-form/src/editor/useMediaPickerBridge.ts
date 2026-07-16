import { useRef, useState } from 'react';

export type PodMediaPickKind = 'image' | 'video';

/**
 * Bridges a URL-callback media picker dialog (@duncit/media-picker) to the pod
 * form's promise-based onPickImage/onPickVideo props. `accept` and `title` are
 * ready-made dialog props for whichever kind is being picked.
 */
export default function useMediaPickerBridge() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<PodMediaPickKind>('image');
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  const openFor = (kind: PodMediaPickKind) =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerKind(kind);
      setPickerOpen(true);
    });

  const pickImage = () => openFor('image');
  const pickVideo = () => openFor('video');

  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  const isVideo = pickerKind === 'video';
  return {
    pickerOpen,
    pickerKind,
    pickImage,
    pickVideo,
    settlePicker,
    accept: isVideo ? 'video/*' : 'image/*,video/*',
    title: isVideo ? 'Pick reel video' : 'Add pod image',
  };
}
