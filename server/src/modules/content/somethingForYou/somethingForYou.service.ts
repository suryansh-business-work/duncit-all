import { GraphQLError } from 'graphql';
import { SomethingForYouModel, type ISomethingForYouItem } from './somethingForYou.model';

const toPub = (doc: ISomethingForYouItem) => ({
  id: String(doc._id),
  title: doc.title,
  image_url: doc.image_url ?? '',
  bottom_text: doc.bottom_text ?? '',
  link_path: doc.link_path ?? '',
  sort_order: doc.sort_order ?? 0,
  is_active: doc.is_active !== false,
  created_at: doc.created_at?.toISOString?.() ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

interface Input {
  title?: string;
  image_url?: string;
  bottom_text?: string;
  link_path?: string;
  sort_order?: number;
  is_active?: boolean;
}

const normalize = (input: Input) => ({
  title: String(input.title ?? '').trim(),
  image_url: String(input.image_url ?? '').trim(),
  bottom_text: String(input.bottom_text ?? '').trim(),
  link_path: String(input.link_path ?? '').trim(),
  sort_order: Number(input.sort_order ?? 0),
  is_active: input.is_active !== false,
});

export const somethingForYouService = {
  /** Everything, newest ordering first, for the admin table. */
  async list(): Promise<ReturnType<typeof toPub>[]> {
    const docs = await SomethingForYouModel.find().sort({ sort_order: 1, created_at: 1 }).lean();
    return (docs as unknown as ISomethingForYouItem[]).map(toPub);
  },

  /**
   * What Home renders: only the cards an admin switched on, in their order.
   *
   * A card with no picture is dropped rather than rendered as a hole — the
   * rail is images with words on them, and an empty one reads as a bug.
   */
  async listPublic(): Promise<ReturnType<typeof toPub>[]> {
    const docs = await SomethingForYouModel.find({ is_active: true })
      .sort({ sort_order: 1, created_at: 1 })
      .lean();
    return (docs as unknown as ISomethingForYouItem[]).map(toPub).filter((item) => item.image_url);
  },

  async create(input: Input) {
    const created = await SomethingForYouModel.create(normalize(input));
    return toPub(created);
  },

  async update(id: string, input: Input) {
    const updated = await SomethingForYouModel.findByIdAndUpdate(id, normalize(input), {
      new: true,
    });
    if (!updated) {
      throw new GraphQLError('That card no longer exists', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    return toPub(updated);
  },

  async remove(id: string) {
    const deleted = await SomethingForYouModel.findByIdAndDelete(id);
    return Boolean(deleted);
  },
};
