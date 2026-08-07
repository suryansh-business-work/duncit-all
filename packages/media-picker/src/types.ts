export type UploadSurface = 'PORTALS' | 'MOBILE' | 'MWEB';

export interface UploadCropPreset {
  key: string;
  label: string;
  /** Target output resolution; 0×0 = keep the source resolution (No Crop). */
  width: number;
  height: number;
  enabled: boolean;
}

/** Admin-managed upload rules for a surface (Admin > Upload Settings). */
export interface UploadSettings {
  id: string;
  surface: UploadSurface;
  max_image_mb: number;
  max_video_mb: number;
  allowed_image_formats: string[];
  allowed_video_formats: string[];
  image_compression_enabled: boolean;
  image_quality: number;
  image_max_dimension: number;
  video_compression_enabled: boolean;
  video_crf: number;
  video_max_height: number;
  ai_image_monitoring_enabled: boolean;
  default_crop_key: string;
  crop_presets: UploadCropPreset[];
}

/** Source-pixel crop rectangle (react-easy-crop's croppedAreaPixels). */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  /**
   * How many images ONE open may return. 1 (the default) is the single-pick
   * behaviour every existing caller relies on — the dialog closes on the first
   * pick. Above 1 the picks collect in a tray and come back together through
   * `onPickedMany`, so a cover can be chosen from Pexels and the device in the
   * same visit.
   */
  max?: number;
  /** Called with every picked URL at once. Required when `max` is above 1. */
  onPickedMany?: (urls: string[]) => void;
  /**
   * What to search Pexels for before the user types anything — the pod's
   * sub-category, say. A cover picker that opens on a blank search makes the
   * user do work the form already knows the answer to.
   */
  seedQuery?: string;
  /** Pexels orientation to start on. A cover is wide, so callers pass 'landscape'. */
  orientation?: Orientation;
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
  /** Upload Settings surface driving sizes/formats/crop presets. */
  surface?: UploadSurface;
}

export type Orientation = 'landscape' | 'portrait' | 'square' | '';

export interface FilePolicy {
  allowImage: boolean;
  allowVideo: boolean;
  allowDocuments: boolean;
}
