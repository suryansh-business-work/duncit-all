import type { StatusUploadKind } from '../statusPipeline';

export interface StatusUploadState {
  active: boolean;
  kind: StatusUploadKind | null;
  progress: number;
  message: string;
  profileUrl?: string | null;
}

export interface StatusUploadContextValue {
  upload: StatusUploadState;
  openProfilePicker: () => void;
  openPodPicker: (podId: string) => void;
  openClubPicker: (clubId: string) => void;
}

export interface PendingPick {
  kind: StatusUploadKind;
  podId?: string;
  clubId?: string;
}
