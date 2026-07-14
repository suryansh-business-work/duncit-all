import { useRef, useState } from 'react';

/** Bridges the URL-callback MediaPickerDialog to the shared form's promise picker. */
export default function useMediaPickerBridge() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerResolve = useRef<((url: string | null) => void) | null>(null);

  const pickImage = () =>
    new Promise<string | null>((resolve) => {
      pickerResolve.current = resolve;
      setPickerOpen(true);
    });

  const settlePicker = (url: string | null) => {
    pickerResolve.current?.(url);
    pickerResolve.current = null;
    setPickerOpen(false);
  };

  return { pickerOpen, pickImage, settlePicker };
}
