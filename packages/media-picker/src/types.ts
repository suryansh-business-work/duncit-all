export interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  /** ImageKit folder e.g. "/users", "/posts", "/branding" */
  folder?: string;
  title?: string;
  /** Comma-separated mime list. Defaults to images and videos. */
  accept?: string;
  /**
   * Allow PDF/document uploads (partner venue documents). When omitted it is
   * derived from `accept` — a picker whose accept list mentions pdf may upload
   * documents. Pass `false` to force-disable even for a pdf accept list.
   */
  allowDocuments?: boolean;
}

export type Orientation = 'landscape' | 'portrait' | 'square' | '';

export interface FilePolicy {
  allowImage: boolean;
  allowVideo: boolean;
  allowDocuments: boolean;
}
