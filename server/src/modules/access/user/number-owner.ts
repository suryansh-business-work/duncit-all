import { Types } from 'mongoose';
import { UserModel } from './user.model';

/**
 * Whether a number already reaches an account other than this one.
 *
 * BOTH fields a number can live in are read, never just one. `accountFor`
 * resolves an account from a number by matching either `auth.phone` or
 * `communication.whatsapp`, so one number on two accounts leaves the three
 * phone doors — password login by phone, Continue with OTP, and recovery —
 * picking between them. Only `auth.phone` carries a unique index; the WhatsApp
 * side has none (the field defaults to `''` on every historical row, so a
 * partial index could not be added without a de-dupe migration first), which
 * is exactly why the rule has to be stated in code.
 *
 * Signup has refused this since the WhatsApp door was built. This is that same
 * refusal in one place, so every later edit reads it the same way (rule 34).
 *
 * `exclude_user_id` is the caller's own account: re-typing the number you
 * already hold — or making your WhatsApp number your mobile as well — is not
 * a clash. Signup passes nothing, because there is no account yet.
 */
export async function numberHeldElsewhere(
  extension: string,
  number: string,
  exclude_user_id?: string
): Promise<boolean> {
  const held = [
    { 'auth.phone.number': number, 'auth.phone.extension': extension },
    { 'communication.whatsapp.number': number, 'communication.whatsapp.extension': extension },
  ];
  const filter: Record<string, unknown> = { $or: held };
  if (exclude_user_id) filter._id = { $ne: new Types.ObjectId(exclude_user_id) };
  return Boolean(await UserModel.exists(filter));
}
