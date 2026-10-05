import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import type { ReportTargetSnapshot } from './report.service';

interface ProfileFields {
  _id: Types.ObjectId;
  profile?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    bio?: string;
    profile_photo?: string;
  };
}

/**
 * What Legal sees of a reported profile, copied at report time.
 *
 * A profile changes the moment its owner hears it was reported — a new photo,
 * a cleaned-up bio — so the queue keeps the version the reporter was looking
 * at: the avatar as the preview, and name, @handle and bio as the caption.
 */
export async function profileReportSnapshot(userId: string): Promise<ReportTargetSnapshot> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new GraphQLError('Invalid user', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const user = await UserModel.findById(userId)
    .select('profile.first_name profile.last_name profile.username profile.bio profile.profile_photo')
    .lean<ProfileFields>();
  if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  const p = user.profile ?? {};
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const handle = p.username ? `@${p.username}` : '';
  const caption = [[name, handle].filter(Boolean).join(' · '), p.bio?.trim() ?? '']
    .filter(Boolean)
    .join('\n');
  const id = user._id.toString();
  return {
    target_type: 'PROFILE',
    target_id: id,
    // The account is its own owner: it is what the report is about, and it is
    // what stops anybody filing a report against themselves.
    target_owner_id: id,
    target_preview_url: p.profile_photo ?? '',
    target_caption: caption.slice(0, 2000),
  };
}
