import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodMessageModel } from '@modules/engagement/chat/chat.model';
import { assertRoomMember, roomOfMessage, socketRoomOf } from '@modules/engagement/chat/chat.access';
import { shapeMessage } from '@modules/engagement/chat/chat.shape';
import { userDisplayOf } from '@modules/access/user/user.display';
import type { ReportTargetSnapshot } from './report.service';

/**
 * What Legal sees of a reported chat line, copied at report time.
 *
 * Only someone in that room can report it — the message is not visible to
 * anyone else — and the copy is taken now because the author can delete the
 * line the moment it is reported, and the room itself ages out.
 */
export async function chatMessageReportSnapshot(
  messageId: string,
  reporterId: string
): Promise<ReportTargetSnapshot> {
  if (!Types.ObjectId.isValid(messageId)) {
    throw new GraphQLError('Invalid message', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const msg = await PodMessageModel.findById(messageId).lean();
  if (!msg || msg.deleted) {
    throw new GraphQLError('This message is no longer there', { extensions: { code: 'NOT_FOUND' } });
  }
  const room = roomOfMessage(msg);
  await assertRoomMember(room, reporterId);
  return {
    target_type: 'MESSAGE',
    target_id: String(msg._id),
    target_owner_id: String(msg.user_id),
    club_id: room.kind === 'CLUB' ? room.id : null,
    target_preview_url: msg.image_url ?? '',
    target_caption: `${socketRoomOf(room)}\n${msg.text ?? ''}`.slice(0, 2000),
  };
}

/**
 * Legal's take-down of a reported chat line: it is blanked for everyone, the
 * same way its author deleting it would, and every open room is told.
 * Returns false when there was nothing left to remove.
 */
export async function takeDownChatMessage(messageId: string): Promise<boolean> {
  const msg = await PodMessageModel.findById(messageId);
  if (!msg || msg.deleted) return false;
  msg.deleted = true;
  msg.text = '';
  msg.image_url = '';
  await msg.save();
  const { emitToRoom } = await import('@modules/engagement/chat/chat.socket');
  const shaped = shapeMessage(msg.toObject(), await userDisplayOf(String(msg.user_id)));
  emitToRoom(roomOfMessage(msg), 'deleted', shaped);
  return true;
}
