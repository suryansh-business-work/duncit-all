import type { AuthUser } from '@context';
import { validate } from '@utils/validate';
import { MANUAL_TEST_LIMITS as L } from './manualTest.constants';
import { ManualTestCaseModel, ManualTestCommentModel } from './manualTest.model';
import {
  badInput,
  commentPub,
  forbidden,
  normalizedRichText,
  notFound,
  peopleOf,
  requireId,
} from './manualTest.pub';
import { commentSchema, type CommentInput } from './manualTest.validator';

const viewerOf = (user: AuthUser) => ({ id: user.id, isSuperAdmin: user.roles.includes('SUPER_ADMIN') });

/** The comment's HTML, refusing one that is empty once the editor's blank paragraph is gone. */
async function bodyOf(input: unknown): Promise<string> {
  const { body } = await validate<CommentInput>(commentSchema, input);
  const html = normalizedRichText(body);
  if (!html) throw badInput('Write a comment first');
  return html;
}

export const manualTestCommentService = {
  /** One page of a case's thread, oldest first. */
  async list(caseId: string, offset: number, user: AuthUser) {
    requireId(caseId, 'Case');
    const start = Math.max(0, Math.trunc(offset || 0));
    const filter = { case_id: caseId };
    const [docs, total] = await Promise.all([
      ManualTestCommentModel.find(filter).sort({ created_at: 1, _id: 1 }).skip(start).limit(L.commentsPageSize).lean(),
      ManualTestCommentModel.countDocuments(filter),
    ]);
    const people = await peopleOf(docs.map((doc) => doc.author_id));
    const viewer = viewerOf(user);
    return { rows: docs.map((doc) => commentPub(doc, people, viewer)), total };
  },

  async add(caseId: string, input: unknown, user: AuthUser) {
    requireId(caseId, 'Case');
    const body = await bodyOf(input);
    if (!(await ManualTestCaseModel.exists({ _id: caseId }))) throw notFound('Case');
    const doc = await ManualTestCommentModel.create({ case_id: caseId, author_id: user.id, body });
    return commentPub(doc, await peopleOf([user.id]), viewerOf(user));
  },

  /** Only the author edits a comment — nobody rewrites what someone else said. */
  async edit(id: string, input: unknown, user: AuthUser) {
    requireId(id, 'Comment');
    const body = await bodyOf(input);
    const doc = await ManualTestCommentModel.findOneAndUpdate(
      { _id: id, author_id: user.id },
      { $set: { body, edited_at: new Date() } },
      { new: true }
    ).lean();
    if (!doc) {
      if (await ManualTestCommentModel.exists({ _id: id })) throw forbidden('Only the author can edit this comment');
      throw notFound('Comment');
    }
    return commentPub(doc, await peopleOf([user.id]), viewerOf(user));
  },

  /** The author deletes their own comment; a super admin may delete any. */
  async remove(id: string, user: AuthUser): Promise<boolean> {
    requireId(id, 'Comment');
    const viewer = viewerOf(user);
    const filter = viewer.isSuperAdmin ? { _id: id } : { _id: id, author_id: user.id };
    const deleted = await ManualTestCommentModel.findOneAndDelete(filter).select('_id').lean();
    if (deleted) return true;
    if (await ManualTestCommentModel.exists({ _id: id })) throw forbidden('Only the author can delete this comment');
    throw notFound('Comment');
  },
};
