import { Schema, model, type Document } from 'mongoose';

/**
 * One Truecaller verification in flight, or one already spent.
 *
 * WEB rows carry the mobile-web handshake: the browser starts one (PENDING),
 * Truecaller posts the person's token to our callback (READY, or REJECTED when
 * they said no), and the browser claims it exactly once (USED). IOS rows are
 * the replay guard for signed profiles — a signature is valid forever, so the
 * same profile must never open a second session.
 */
export const TRUECALLER_KINDS = ['WEB', 'IOS'] as const;
export const TRUECALLER_STATES = ['PENDING', 'READY', 'REJECTED', 'USED'] as const;
export type TruecallerState = (typeof TRUECALLER_STATES)[number];

/** Long enough for somebody to read Truecaller's sheet; short enough to be useless later. */
export const TRUECALLER_REQUEST_TTL_MS = 10 * 60 * 1000;

export interface ITruecallerRequest extends Document {
  /** WEB: the request nonce. IOS: sha256 of the signed payload. */
  key: string;
  kind: (typeof TRUECALLER_KINDS)[number];
  state: TruecallerState;
  /** select:false — with it, anybody could read the person's profile. */
  access_token: string;
  endpoint: string;
  expires_at: Date;
}

const truecallerRequestSchema = new Schema<ITruecallerRequest>(
  {
    key: { type: String, required: true, unique: true },
    kind: { type: String, enum: TRUECALLER_KINDS, required: true },
    state: { type: String, enum: TRUECALLER_STATES, default: 'PENDING' },
    access_token: { type: String, default: '', select: false },
    endpoint: { type: String, default: '' },
    expires_at: { type: Date, required: true, index: { expireAfterSeconds: 3600 } },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const TruecallerRequestModel = model<ITruecallerRequest>(
  'TruecallerRequest',
  truecallerRequestSchema
);
