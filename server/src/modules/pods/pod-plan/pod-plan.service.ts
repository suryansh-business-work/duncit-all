import { GraphQLError } from 'graphql';
import { PodPlanModel, type IPodPlan } from './pod-plan.model';

const toPub = (d: IPodPlan) => ({
  id: String(d._id),
  key: d.key,
  name: d.name,
  description: d.description ?? '',
  image_url: d.image_url ?? '',
  features: d.features ?? [],
  price_label: d.price_label ?? '',
  is_coming_soon: !!d.is_coming_soon,
  sort_order: d.sort_order ?? 0,
  is_active: !!d.is_active,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

const DEFAULT_PLANS = [
  {
    key: 'free',
    name: 'Free Pod',
    description:
      'Host casual meetups with the basics — perfect for trying things out and gathering your first few members.',
    image_url:
      'https://ik.imagekit.io/esdata1/branding/duncit-logo_eGbnvaKyd.png?tr=w-512,h-512',
    features: [
      'Up to 10 attendees per pod',
      'Basic discovery in your city',
      'In-app chat with attendees',
      'WhatsApp share link',
    ],
    price_label: 'Free forever',
    is_coming_soon: false,
    sort_order: 0,
    is_active: true,
  },
  {
    key: 'premium',
    name: 'Premium Pod',
    description:
      'Unlock larger pods, paid bookings, and richer hosting tools to grow your community on Duncit.',
    image_url:
      'https://ik.imagekit.io/esdata1/branding/duncit-logo_eGbnvaKyd.png?tr=w-512,h-512',
    features: [
      'Unlimited attendees',
      'Paid pods with secure checkout',
      'Boosted placement in feed',
      'Branded posters & WhatsApp templates',
      'Priority host support',
    ],
    price_label: 'Coming soon',
    is_coming_soon: true,
    sort_order: 1,
    is_active: true,
  },
];

export const podPlanService = {
  async list() {
    const docs = await PodPlanModel.find().sort({ sort_order: 1, name: 1 });
    return docs.map(toPub);
  },

  async listPublic() {
    const docs = await PodPlanModel.find({ is_active: true }).sort({
      sort_order: 1,
      name: 1,
    });
    return docs.map(toPub);
  },

  async create(input: any) {
    const key = String(input.key || '').trim().toLowerCase();
    if (!key) throw new GraphQLError('Plan key is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const exists = await PodPlanModel.findOne({ key });
    if (exists) throw new GraphQLError('A plan with this key already exists', { extensions: { code: 'CONFLICT' } });
    const doc = await PodPlanModel.create({
      key,
      name: input.name,
      description: input.description ?? '',
      image_url: input.image_url ?? '',
      features: input.features ?? [],
      price_label: input.price_label ?? '',
      is_coming_soon: !!input.is_coming_soon,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await PodPlanModel.findByIdAndUpdate(id, input, { new: true });
    if (!doc) throw new GraphQLError('Pod plan not found', { extensions: { code: 'NOT_FOUND' } });
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await PodPlanModel.findByIdAndDelete(id);
    return !!res;
  },

  async seedDefaults() {
    for (const p of DEFAULT_PLANS) {
      await PodPlanModel.updateOne(
        { key: p.key },
        { $setOnInsert: p },
        { upsert: true }
      );
    }
  },
};
