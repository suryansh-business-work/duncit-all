import { Schema, model, Types, type Document } from 'mongoose';

export type MembershipStatus = 'JOINED' | 'BACKED_OUT';
export type RefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';
export type JoinSource = 'DIRECT' | 'REFERRAL' | 'PAID' | 'FREE' | 'HOST_ADD';

export interface IPodMember extends Document {
  pod_id: Types.ObjectId;
  user_id: Types.ObjectId;
  status: MembershipStatus;
  joined_at: Date;
  backed_out_at: Date | null;
  payment_id: Types.ObjectId | null;
  source: JoinSource;
  referral_token: string | null;
  referred_by: Types.ObjectId | null;
  refund_status: RefundStatus;
  refund_payment_id: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const podMemberSchema = new Schema<IPodMember>(
  {
    pod_id: { type: Schema.Types.ObjectId, ref: 'Pod', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['JOINED', 'BACKED_OUT'], default: 'JOINED', index: true },
    joined_at: { type: Date, default: () => new Date() },
    backed_out_at: { type: Date, default: null },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    source: {
      type: String,
      enum: ['DIRECT', 'REFERRAL', 'PAID', 'FREE', 'HOST_ADD'],
      default: 'DIRECT',
    },
    referral_token: { type: String, default: null, index: true, sparse: true },
    referred_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    refund_status: {
      type: String,
      enum: ['NONE', 'PENDING', 'PROCESSED', 'NOT_ELIGIBLE'],
      default: 'NONE',
    },
    refund_payment_id: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

podMemberSchema.index({ pod_id: 1, user_id: 1, status: 1 });

export const PodMemberModel = model<IPodMember>('PodMember', podMemberSchema);
