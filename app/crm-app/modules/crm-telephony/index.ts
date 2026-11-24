import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * The phone side of Duncit CRM (Kotlin, modules/crm-telephony/android).
 * Android only — `null` on any other runtime (web, jest), and every caller
 * treats that as "this phone feature is not available here".
 */

/** android.provider.CallLog.Calls.TYPE */
export const CALL_TYPE = {
  INCOMING: 1,
  OUTGOING: 2,
  MISSED: 3,
  VOICEMAIL: 4,
  REJECTED: 5,
  BLOCKED: 6,
} as const;

export interface CallLogEntry {
  id: string;
  number: string;
  type: number;
  /** When the call started, ms since epoch. */
  date: number;
  durationSeconds: number;
  cachedName: string;
}

export interface RecordingFile {
  uri: string;
  name: string;
  sizeBytes: number;
  addedAtMs: number;
  durationMs: number;
  mimeType: string;
  relativePath: string;
}

export interface DirectoryMatch {
  entityType: string;
  leadId: string;
  leadName: string;
  contactName: string;
  others: number;
}

/** What the call receiver left behind for the post-call screen. */
export interface PendingPostCall {
  number: string;
  direction: 'INBOUND' | 'OUTBOUND';
  answered: boolean;
  startedAt: number;
  endedAt: number;
  entityType?: string;
  leadId?: string;
  leadName?: string;
  contactName?: string;
}

export interface CrmTelephonyModule {
  /** True when the call was placed directly; false when the phone's dialer opened instead. */
  placeCall(number: string): boolean;
  getCallLog(sinceMs: number, limit: number): Promise<CallLogEntry[]>;
  findRecordings(fromMs: number, toMs: number): Promise<RecordingFile[]>;
  copyRecordingToCache(uri: string, fileName: string): Promise<string>;
  deleteCachedRecording(path: string): Promise<boolean>;
  writeDirectory(json: string): Promise<void>;
  lookupNumber(number: string): Promise<DirectoryMatch | null>;
  clearAll(): Promise<void>;
  setFeatures(callerId: boolean, postCall: boolean): void;
  takePendingPostCall(): PendingPostCall | null;
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  canPinShortcut(): boolean;
  pinDialerShortcut(label: string): boolean;
}

export const CrmTelephony = requireOptionalNativeModule<CrmTelephonyModule>('CrmTelephony');
