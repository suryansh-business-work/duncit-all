import type { Control } from 'react-hook-form';
import type { BannerKitValues } from '@duncit/forms/schemas';

/** Whose kit it is: a venue's photos are its space, a host's are portraits plus past events. */
export type BannerKitEntity = 'VENUE' | 'HOST';

export interface BannerKitPhoto {
  url: string;
  caption: string;
}

/** `BannerKit` as the API answers it. */
export interface BannerKitData extends BannerKitValues {
  suggested_photos: string[];
}

export type BannerKitControl = Control<BannerKitValues>;

export interface BannerKitFormProps {
  entity: BannerKitEntity;
  /** The venue's or the host's id: uploads are filed in its folder. */
  entityId: string;
  /** The venue's or the host's name, as the preview shows it. */
  name: string;
  kit: BannerKitData;
  /** Persists the kit; rejects when the server refuses. */
  onSave: (values: BannerKitValues) => Promise<void>;
}

export interface BannerKitPhotosFieldProps {
  control: BannerKitControl;
  name: 'photos' | 'event_photos';
  label: string;
  hint: string;
  max: number;
  /** The ImageKit feature folder uploads are filed under (`/venues`, `/hosts/photo`). */
  folder: string;
  entityId: string;
  /** Offered with "Use suggested photos"; omit for a list with nothing on file. */
  suggested?: readonly string[];
}

export interface BannerKitPhotoRowProps {
  control: BannerKitControl;
  name: 'photos' | 'event_photos';
  index: number;
  /** The row is the list's last: it cannot move down. */
  last: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

export interface BannerKitPreviewProps {
  entity: BannerKitEntity;
  name: string;
  control: BannerKitControl;
}
