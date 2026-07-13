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

type AddressInput = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
};

const toAddress = (a?: any) =>
  a
    ? {
        line1: a.line1 ?? null,
        line2: a.line2 ?? null,
        city: a.city ?? null,
        state: a.state ?? null,
        pincode: a.pincode ?? null,
        country: a.country ?? null,
      }
    : null;

const toPub = (type: VerificationType, doc?: UserVerificationDoc | null) => ({
  type,
  status: doc?.status ?? 'NOT_SUBMITTED',
  document_url: doc?.document_url ?? null,
  address: toAddress(doc?.address),
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
  // The full type list for a user. Missing rows are NOT_SUBMITTED; EMAIL derives
  // its terminal VERIFIED_BY_APP status from the login email's OTP verification.
  async listForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    const oid = new Types.ObjectId(userId);
    const [docs, user] = await Promise.all([
      UserVerificationModel.find({ user_id: oid }),
      UserModel.findById(oid).select('auth.is_email_verified'),
    ]);
    const byType = new Map(docs.map((d) => [d.type as VerificationType, d as UserVerificationDoc]));
    const emailVerified = !!(user as any)?.auth?.is_email_verified;

    return VERIFICATION_TYPES.map((type) => {
      // EMAIL is verified by the app at login — terminal, never a stored row.
      if (type === 'EMAIL') {
        return { ...toPub(type, null), status: emailVerified ? 'VERIFIED_BY_APP' : 'NOT_SUBMITTED' };
      }
      const doc = byType.get(type);
      return toPub(type, doc);
    });
  },

  async submit(userId: string, type: string, documentUrl: string) {
    assertType(type);
    if (type !== 'IDENTITY') {
      throw new GraphQLError('Use submitAddressVerification for ADDRESS', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    validateDocumentUrl(documentUrl);
    const doc = await UserVerificationModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), type },
      {
        $set: {
          status: 'PENDING',
          document_url: documentUrl,
          address: null,
          reject_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        },
      },
      { new: true, upsert: true }
    );
    return toPub(type, doc);
  },

  async submitAddress(userId: string, input: AddressInput) {
    const doc = await UserVerificationModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), type: 'ADDRESS' },
      {
        $set: {
          status: 'PENDING',
          document_url: null,
          address: {
            line1: input.line1,
            line2: input.line2 ?? null,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            country: input.country ?? null,
          },
          reject_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        },
      },
      { new: true, upsert: true }
    );
    return toPub('ADDRESS', doc);
  },

  async review(
    adminId: string,
    userId: string,
    type: string,
    status: string,
    rejectReason?: string | null
  ) {
    assertType(type);
    if (type === 'EMAIL') {
      throw new GraphQLError('EMAIL is verified by the app and cannot be reviewed', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
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
    return toPub(type, doc);
  },
};
