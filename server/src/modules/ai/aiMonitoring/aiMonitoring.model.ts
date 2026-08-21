import { Schema, model, type Document } from 'mongoose';

/**
 * How far an AI monitoring check got. Kept separate from the verdict: a check
 * that never ran (no OpenAI key) and a check that ran and found nothing look
 * identical if you only store the risk.
 */
export const MONITORING_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'SKIPPED'] as const;
export type MonitoringStatus = (typeof MONITORING_STATUSES)[number];

/** The verdict itself — what the model said about the image. */
export const MONITORING_RESULTS = ['PENDING', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type MonitoringResult = (typeof MONITORING_RESULTS)[number];

/**
 * What the platform did with the verdict. Nothing is blocked at upload time
 * today — the scan is async and best-effort — so a risky image is FLAGGED for a
 * human, never silently dropped. BLOCKED exists for the day that changes and is
 * only ever written by the same derivation below.
 */
export const MONITORING_ACTIONS = ['NONE', 'ALLOWED', 'FLAGGED', 'BLOCKED'] as const;
export type MonitoringAction = (typeof MONITORING_ACTIONS)[number];

/**
 * Append-only AI monitoring log — one row per image checked, written on every
 * upload the AI Monitoring package fronts (native, mWeb and every portal).
 * Read by AI Portal > AI Monitoring > Logs.
 */
export interface IMediaScanLog extends Document {
  url: string;
  file_name: string;
  /** Where the file landed — doubles as the Source/Module of the upload. */
  folder: string;
  surface: string;
  user_id?: string;
  /** Verdict (AI Result). */
  risk: MonitoringResult;
  /** How far the check got (Monitoring Status). */
  status: MonitoringStatus;
  /** What was done about it (Action Taken). */
  action: MonitoringAction;
  /** Reason / comment — the model's one-line explanation, or why it never ran. */
  summary: string;
  /** Model that produced the verdict (`ai_model`, because Document.model is taken). */
  ai_model: string;
  /** Wall time of the AI call; 0 when it never ran. */
  duration_ms: number;
  /** Failure detail when status is FAILED — the rest of the traceability. */
  error: string;
  /** When the verdict landed (null while PENDING). */
  checked_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const mediaScanLogSchema = new Schema<IMediaScanLog>(
  {
    url: { type: String, required: true },
    file_name: { type: String, default: '' },
    folder: { type: String, default: '' },
    surface: { type: String, default: '' },
    user_id: { type: String },
    risk: { type: String, enum: MONITORING_RESULTS, default: 'PENDING' },
    status: { type: String, enum: MONITORING_STATUSES, default: 'PENDING' },
    action: { type: String, enum: MONITORING_ACTIONS, default: 'NONE' },
    summary: { type: String, default: '' },
    ai_model: { type: String, default: '' },
    duration_ms: { type: Number, default: 0 },
    error: { type: String, default: '' },
    checked_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

mediaScanLogSchema.index({ created_at: -1 });

export const MediaScanLogModel = model<IMediaScanLog>('MediaScanLog', mediaScanLogSchema);

/**
 * The one place the AI Monitoring chip/dialog copy lives.
 *
 * Every surface renders this document, so changing a sentence here changes it
 * in the native app, mWeb and all seventeen portals at once — which is the
 * whole reason the copy is not hardcoded next to each upload field.
 */
export interface IAiMonitoringSetting extends Document {
  /** Singleton discriminator — always 'default'. */
  key: string;
  /** Master switch for the chip. Off hides it everywhere; scans still log. */
  chip_enabled: boolean;
  chip_label: string;
  dialog_title: string;
  dialog_intro: string;
  /** The bullet list in the dialog body. */
  dialog_points: string[];
  dialog_footnote: string;
  dismiss_label: string;
  created_at: Date;
  updated_at: Date;
}

const aiMonitoringSettingSchema = new Schema<IAiMonitoringSetting>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    chip_enabled: { type: Boolean, default: true },
    chip_label: { type: String, default: '' },
    dialog_title: { type: String, default: '' },
    dialog_intro: { type: String, default: '' },
    dialog_points: { type: [String], default: [] },
    dialog_footnote: { type: String, default: '' },
    dismiss_label: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export const AiMonitoringSettingModel = model<IAiMonitoringSetting>(
  'AiMonitoringSetting',
  aiMonitoringSettingSchema,
);
