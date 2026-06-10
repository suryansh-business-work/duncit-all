export interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  /** ImageKit folder e.g. "/users", "/posts", "/branding" */
  folder?: string;
  title?: string;
  /** Comma-separated mime list. Defaults to images and videos. */
  accept?: string;
}

export type Orientation = 'landscape' | 'portrait' | 'square' | '';
