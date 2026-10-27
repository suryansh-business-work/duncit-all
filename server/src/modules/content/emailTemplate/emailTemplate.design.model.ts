import mongoose, { Schema, Document } from 'mongoose';

/**
 * What the one-time design pass (`emailTemplate.design`) replaced, one row per
 * template or fragment, so the pass has a way back: an admin's edited body is
 * never lost, only moved here.
 *
 * Unique on (version, kind, key) and written with `$setOnInsert`, so the FIRST
 * value read is the one kept — a second instance booting alongside, or a re-run
 * after a crash, cannot overwrite it with a body the pass already replaced.
 * A `done` row marks a version as applied.
 */
export type EmailDesignBackupKind = 'template' | 'fragment' | 'done';

export interface IEmailDesignBackup extends Document {
  version: string;
  kind: EmailDesignBackupKind;
  /** The template's slug or the fragment's key; `*` on the `done` row. */
  key: string;
  mjml?: string;
  header_mjml?: string;
  footer_mjml?: string;
  is_active?: boolean;
  /** On the `done` row: how many rows the pass moved. */
  templates?: number;
  fragments?: number;
  connected?: number;
}

const EmailDesignBackupSchema = new Schema<IEmailDesignBackup>(
  {
    version: { type: String, required: true },
    kind: { type: String, required: true, enum: ['template', 'fragment', 'done'] },
    key: { type: String, required: true },
    mjml: String,
    header_mjml: String,
    footer_mjml: String,
    is_active: Boolean,
    templates: Number,
    fragments: Number,
    connected: Number,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

EmailDesignBackupSchema.index({ version: 1, kind: 1, key: 1 }, { unique: true });

export const EmailDesignBackupModel =
  (mongoose.models.EmailDesignBackup as mongoose.Model<IEmailDesignBackup>) ||
  mongoose.model<IEmailDesignBackup>('EmailDesignBackup', EmailDesignBackupSchema);
