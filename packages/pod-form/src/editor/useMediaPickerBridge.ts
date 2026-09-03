import { useRef, useState } from 'react';
import type { PodMediaPickOptions } from '../types';

export type PodMediaPickKind = 'image' | 'video';
export type { PodMediaPickOptions };

/**
 * Bridges a URL-callback media picker dialog (@duncit/media-picker) to the pod
 * form's promise-based onPickImage/onPickVideo props. `accept`, `title` and
 * `seedQuery` are ready-made dialog props for whichever pick is open.
 */
export default function useMediaPickerBridge() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<PodMediaPickKind>('image');
  const [seedQuery, setSeedQuery] = useState('');
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  const openFor = (kind: PodMediaPickKind, options?: PodMediaPickOptions) =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerKind(kind);
      setSeedQuery(options?.seedQuery ?? '');
      setPickerOpen(true);
    });

  const pickImage = (options?: PodMediaPickOptions) => openFor('image', options);
  const pickVideo = (options?: PodMediaPickOptions) => openFor('video', options);

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
    seedQuery,
    accept: isVideo ? 'video/*' : 'image/*,video/*',
    title: isVideo ? 'Pick reel video' : 'Add pod image',
  };
}
