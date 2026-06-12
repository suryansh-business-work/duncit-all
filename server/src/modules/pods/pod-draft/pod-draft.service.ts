import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodDraftModel, type IPodDraft } from './pod-draft.model';
import { podService } from '../pod/pod.service';

const toPub = (d: IPodDraft) => ({
  id: String(d._id),
  pod_title: d.pod_title ?? '',
  pod_mode: d.pod_mode ?? 'PHYSICAL',
  step: d.step ?? 0,
  payload: d.payload ?? '',
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

const ownDraft = async (userId: string, draftId: string): Promise<IPodDraft> => {
  const doc = await PodDraftModel.findOne({ _id: draftId, user_id: new Types.ObjectId(userId) });
  if (!doc) throw new GraphQLError('Draft not found', { extensions: { code: 'NOT_FOUND' } });
  return doc;
};

const draftFields = (input: any) => ({
  payload: input.payload ?? '',
  pod_title: input.pod_title ?? '',
  pod_mode: input.pod_mode ?? 'PHYSICAL',
  step: input.step ?? 0,
});

export const podDraftService = {
  async listMine(userId: string) {
    const docs = await PodDraftModel.find({ user_id: new Types.ObjectId(userId) }).sort({
      updated_at: -1,
    });
    return docs.map(toPub);
  },

  async getMine(userId: string, draftId: string) {
    return toPub(await ownDraft(userId, draftId));
  },

  async save(userId: string, draftId: string | null | undefined, input: any) {
    if (draftId) {
      const doc = await ownDraft(userId, draftId);
      doc.set(draftFields(input));
      await doc.save();
      return toPub(doc);
    }
    const created = await PodDraftModel.create({
      user_id: new Types.ObjectId(userId),
      ...draftFields(input),
    });
    return toPub(created);
  },

  async remove(userId: string, draftId: string) {
    const res = await PodDraftModel.deleteOne({
      _id: draftId,
      user_id: new Types.ObjectId(userId),
    });
    return res.deletedCount > 0;
  },

  // Validates + creates the real pod via the shared partner path (approved
  // host + venue checks live there), then removes the now-published draft.
  async publish(userId: string, draftId: string, input: any) {
    const draft = await ownDraft(userId, draftId);
    const pod = await podService.createForPartner(userId, input);
    await PodDraftModel.deleteOne({ _id: draft._id });
    return pod;
  },
};
