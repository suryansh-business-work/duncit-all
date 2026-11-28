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
  /** When the recorder last wrote the file; missing from app builds before it was read. */
  modifiedAtMs?: number;
  durationMs: number;
  mimeType: string;
  relativePath: string;
}

/** One CRM lead behind a number, as the offline directory holds it. */
export interface DirectoryEntry {
  entityType: string;
  leadId: string;
  leadName: string;
  contactName: string;
  /** The lead's status, city and assignee; absent on an app built before they were added. */
  status?: string;
  city?: string;
  assignee?: string;
}

export interface DirectoryMatch extends DirectoryEntry {
  others: number;
}

/** A CRM contact found by the dialer's Contacts search. */
export interface DirectoryContact extends DirectoryEntry {
  /** The number's last ten digits — what the dialer calls. */
  phoneKey: string;
}

/** A recent call with a CRM contact (personal calls are filtered out on the phone). */
export interface RecentCrmCall extends DirectoryEntry {
  id: string;
  number: string;
  type: number;
  date: number;
  durationSeconds: number;
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

/** A folder the phone's call recorder saves into, found on the phone (no path is assumed). */
export interface RecordingFolder {
  relativePath: string;
  count: number;
  latestMs: number;
}

/** What Settings › Calling & recording shows about this phone (CallingDiagnostics.kt). */
export interface CallingDiagnostics {
  manufacturer: string;
  model: string;
  sdk: number;
  phoneState: boolean;
  callLog: boolean;
  overlay: boolean;
  notifications: boolean;
  /** The default dialer's name, e.g. "Phone" (Samsung). */
  defaultDialer: string;
  dialerIsDuncit: boolean;
  /** Outgoing caller ID for calls placed from any dialer needs this role. */
  redirectionAvailable: boolean;
  redirectionHeld: boolean;
  batteryUnrestricted: boolean;
  backgroundRestricted: boolean;
  callerIdOn: boolean;
  autoLogOn: boolean;
  directoryNumbers: number;
}

/** How the test caller card showed; `empty` when the directory has no numbers yet. */
export type TestCardResult = 'overlay' | 'notification' | 'empty';

export interface CrmTelephonyModule {
  /** True when the call was placed directly; false when the phone's dialer opened instead. */
  placeCall(number: string): boolean;
  getCallLog(sinceMs: number, limit: number): Promise<CallLogEntry[]>;
  findRecordings(fromMs: number, toMs: number): Promise<RecordingFile[]>;
  recordingFolders(sinceMs: number): Promise<RecordingFolder[]>;
  diagnostics(): CallingDiagnostics;
  /** False when Android cannot offer the role on this phone. */
  requestRedirectionRole(): boolean;
  testCallerCard(): TestCardResult;
  /** The key's DTMF beep; false when the phone's dialling pad tones are off. */
  playDialTone(key: string): boolean;
  copyRecordingToCache(uri: string, fileName: string): Promise<string>;
  deleteCachedRecording(path: string): Promise<boolean>;
  writeDirectory(json: string): Promise<void>;
  lookupNumber(number: string): Promise<DirectoryMatch | null>;
  searchDirectory(query: string, limit: number): Promise<DirectoryContact[]>;
  recentCrmCalls(limit: number): Promise<RecentCrmCall[]>;
  clearAll(): Promise<void>;
  setFeatures(callerId: boolean, postCall: boolean): void;
  takePendingPostCall(): PendingPostCall | null;
  canDrawOverlays(): boolean;
  openOverlaySettings(): void;
  canPinShortcut(): boolean;
  pinDialerShortcut(label: string): boolean;
}

export const CrmTelephony = requireOptionalNativeModule<CrmTelephonyModule>('CrmTelephony');
