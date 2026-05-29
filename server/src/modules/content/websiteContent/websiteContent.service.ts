import { GraphQLError } from 'graphql';
import { WebsiteContentModel, type IWebsiteContent, type WebsitePageType } from './websiteContent.model';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);

const toPub = (doc: IWebsiteContent) => ({
  id: String(doc._id),
  type: doc.type,
  title: doc.title,
  slug: doc.slug,
  summary: doc.summary ?? '',
  body: doc.body ?? '',
  category: doc.category ?? '',
  image_url: doc.image_url ?? '',
  cta_label: doc.cta_label ?? '',
  cta_url: doc.cta_url ?? '',
  published_at: doc.published_at?.toISOString?.() ?? null,
  is_published: !!doc.is_published,
  sort_order: doc.sort_order ?? 0,
  created_at: doc.created_at?.toISOString?.() ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

function normalizeInput(input: any) {
  const title = String(input.title ?? '').trim();
  const slug = slugify(input.slug || title);
  if (!slug) {
    throw new GraphQLError('Slug could not be generated', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return {
    type: input.type as WebsitePageType,
    title,
    slug,
    summary: input.summary ?? '',
    body: input.body ?? '',
    category: input.category ?? '',
    image_url: input.image_url ?? '',
    cta_label: input.cta_label ?? '',
    cta_url: input.cta_url ?? '',
    published_at: input.published_at ? new Date(input.published_at) : null,
    is_published: input.is_published !== false,
    sort_order: input.sort_order ?? 0,
  };
}

const blogSeed = [
  {
    type: 'BLOG',
    title: 'How Duncit Turns Local Plans Into Real Friendships',
    slug: 'how-duncit-turns-local-plans-into-real-friendships',
    summary: 'A quick look at how shared intent, nearby venues, and host-led pods make offline connection easier.',
    body: 'Duncit is designed around small, real-world moments. Hosts create pods, venues make space for them, and members join plans that match their energy.',
    category: 'Product',
    image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80&auto=format&fit=crop',
    published_at: new Date('2026-04-14T00:00:00.000Z'),
    is_published: true,
    sort_order: 10,
  },
  {
    type: 'BLOG',
    title: 'A Simple Playbook For First-Time Hosts',
    slug: 'simple-playbook-for-first-time-hosts',
    summary: 'Practical ideas for setting expectations, choosing venues, and helping guests feel welcome.',
    body: 'Good hosting starts before the meetup. Pick a clear theme, keep the group size intentional, and share the details guests need to arrive relaxed.',
    category: 'Community',
    image_url: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=900&q=80&auto=format&fit=crop',
    published_at: new Date('2026-04-02T00:00:00.000Z'),
    is_published: true,
    sort_order: 20,
  },
  {
    type: 'BLOG',
    title: 'Why Safety Belongs In The First Version',
    slug: 'why-safety-belongs-in-the-first-version',
    summary: 'The trust basics we care about before a community starts scaling.',
    body: 'Verification, moderation, and clear venue workflows are not future extras. They are the foundation that lets people show up with confidence.',
    category: 'Safety',
    image_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&q=80&auto=format&fit=crop',
    published_at: new Date('2026-03-21T00:00:00.000Z'),
    is_published: true,
    sort_order: 30,
  },
];

export const websiteContentService = {
  async list(type?: WebsitePageType | null, publicOnly = false) {
    const query: any = {};
    if (type) query.type = type;
    if (publicOnly) query.is_published = true;
    const docs = await WebsiteContentModel.find(query).sort({ sort_order: 1, published_at: -1, created_at: -1 });
    return docs.map(toPub);
  },

  async create(input: any) {
    try {
      const created = await WebsiteContentModel.create(normalizeInput(input));
      return toPub(created);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new GraphQLError('Slug already exists for this page type', {
          extensions: { code: 'CONFLICT' },
        });
      }
      throw error;
    }
  },

  async update(id: string, input: any) {
    try {
      const updated = await WebsiteContentModel.findByIdAndUpdate(id, normalizeInput(input), {
        new: true,
      });
      if (!updated) throw new GraphQLError('Content not found', { extensions: { code: 'NOT_FOUND' } });
      return toPub(updated);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new GraphQLError('Slug already exists for this page type', {
          extensions: { code: 'CONFLICT' },
        });
      }
      throw error;
    }
  },

  async remove(id: string) {
    const deleted = await WebsiteContentModel.findByIdAndDelete(id);
    return !!deleted;
  },

  async seedDefaults() {
    const existingBlogCount = await WebsiteContentModel.countDocuments({ type: 'BLOG' });
    if (existingBlogCount > 0) return;
    await WebsiteContentModel.insertMany(blogSeed);
  },
};