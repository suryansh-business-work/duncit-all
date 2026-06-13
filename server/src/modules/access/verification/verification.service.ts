import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';

import { UserModel } from '@modules/access/user/user.model';
import {
  UserVerificationModel,
  VERIFICATION_TYPES,
  type UserVerificationDoc,
  type VerificationType,
} from './verification.model';

const iso = (d?: Date | null) => (d ? d.toISOString() : null);

const toPub = (type: VerificationType, doc?: UserVerificationDoc | null) => ({
  type,
  status: doc?.status ?? 'NOT_SUBMITTED',
  document_url: doc?.document_url ?? null,
  reject_reason: doc?.reject_reason ?? null,
  reviewed_at: iso(doc?.reviewed_at),
  updated_at: iso((doc as any)?.updated_at),
});

function assertType(type: string): asserts type is VerificationType {
  if (!(VERIFICATION_TYPES as readonly string[]).includes(type)) {
    throw new GraphQLError('Invalid verification type', { extensions: { code: 'BAD_USER_INPUT' } });
  }
}

function validateDocumentUrl(url: string) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new GraphQLError('Upload a document through the picker first', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

export const verificationService = {
  // The full 7-type list for a user. Missing rows are NOT_SUBMITTED; EMAIL/PHONE
  // auto-approve from the existing OTP verification when not separately submitted.
  async listForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const oid = new Types.ObjectId(userId);
    const [docs, user] = await Promise.all([
      UserVerificationModel.find({ user_id: oid }),
      UserModel.findById(oid).select('auth.is_email_verified auth.phone.is_verified'),
    ]);
    const byType = new Map(docs.map((d) => [d.type as VerificationType, d as UserVerificationDoc]));
    const emailVerified = !!(user as any)?.auth?.is_email_verified;
    const phoneVerified = !!(user as any)?.auth?.phone?.is_verified;

    return VERIFICATION_TYPES.map((type) => {
      const doc = byType.get(type);
      if (doc) return toPub(type, doc);
      if (type === 'EMAIL' && emailVerified) return { ...toPub(type, null), status: 'APPROVED' };
      if (type === 'PHONE' && phoneVerified) return { ...toPub(type, null), status: 'APPROVED' };
      return toPub(type, null);
    });
  },

  async submit(userId: string, type: string, documentUrl: string) {
    assertType(type);
    validateDocumentUrl(documentUrl);
    const doc = await UserVerificationModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), type },
      {
        $set: {
          status: 'PENDING',
          document_url: documentUrl,
          reject_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        },
      },
      { new: true, upsert: true }
    );
    return toPub(type, doc as UserVerificationDoc);
  },

  async review(
    adminId: string,
    userId: string,
    type: string,
    status: string,
    rejectReason?: string | null
  ) {
    assertType(type);
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new GraphQLError('Status must be APPROVED or REJECTED', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await UserVerificationModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), type },
      {
        $set: {
          status,
          reject_reason: status === 'REJECTED' ? (rejectReason ?? null) : null,
          reviewed_by: new Types.ObjectId(adminId),
          reviewed_at: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    return toPub(type, doc as UserVerificationDoc);
  },
};
