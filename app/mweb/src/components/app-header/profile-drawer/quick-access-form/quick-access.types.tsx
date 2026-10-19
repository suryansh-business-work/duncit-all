import type { ProfileMenuFlags, ProfileMenuKey } from '@duncit/utils';

/** Values managed by the Quick Access editor: the six tiles, in grid order. */
export interface QuickAccessFormValues {
  selection: ProfileMenuKey[];
}

export interface QuickAccessFormProps {
  open: boolean;
  /** The grid as it is now — what the dialog opens on. */
  current: readonly ProfileMenuKey[];
  flags: ProfileMenuFlags;
  /** The last save could not be kept in this browser. */
  saveFailed: boolean;
  onClose: () => void;
  onSave: (selection: ProfileMenuKey[]) => void;
}
