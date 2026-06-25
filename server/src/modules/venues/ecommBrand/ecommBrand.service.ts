import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { EcommBrandModel, type IEcommBrand } from './ecommBrand.model';
import { UserModel } from '@modules/access/user/user.model';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const toPub = (b: IEcommBrand) => ({
  id: String(b._id),
  owner_user_id: String(b.owner_user_id),
  brand_name: b.brand_name ?? '',
  logo_url: b.logo_url ?? '',
  cover_image_url: b.cover_image_url ?? '',
  tagline: b.tagline ?? '',
  description: b.description ?? '',
  product_categories: b.product_categories ?? [],
  website_url: b.website_url ?? '',
  instagram_url: b.instagram_url ?? '',
  contact_person: b.contact_person ?? '',
  contact_email: b.contact_email ?? '',
  contact_phone: b.contact_phone ?? '',
  registered_business_name: b.registered_business_name ?? '',
  gstin: b.gstin ?? '',
  pan: b.pan ?? '',
  established_year: b.established_year ?? null,
  address_line1: b.address_line1 ?? '',
  city: b.city ?? '',
  state: b.state ?? '',
  postal_code: b.postal_code ?? '',
  country: b.country ?? 'India',
  account_holder_name: b.account_holder_name ?? '',
  account_number: b.account_number ?? '',
  ifsc_code: b.ifsc_code ?? '',
  upi_id: b.upi_id ?? '',
  documents: (b.documents ?? []).map((d) => ({ type: d.type, url: d.url })),
  tags: b.tags ?? [],
  status: b.status,
  is_active: b.is_active ?? true,
  reviewer_notes: b.reviewer_notes ?? '',
  submitted_at: b.submitted_at ? b.submitted_at.toISOString() : null,
  approved_at: b.approved_at ? b.approved_at.toISOString() : null,
  rejected_at: b.rejected_at ? b.rejected_at.toISOString() : null,
  created_at: b.created_at?.toISOString?.() ?? '',
  updated_at: b.updated_at?.toISOString?.() ?? '',
});

const TEXT_FIELDS = [
  'brand_name', 'logo_url', 'cover_image_url', 'tagline', 'description', 'website_url',
  'instagram_url', 'contact_person', 'contact_email', 'contact_phone',
  'registered_business_name', 'gstin', 'pan', 'address_line1', 'city', 'state',
  'postal_code', 'country', 'account_holder_name', 'account_number', 'ifsc_code', 'upi_id',
] as const;

function applyInput(brand: IEcommBrand, input: any) {
  for (const field of TEXT_FIELDS) {
    if (input[field] !== undefined) (brand as any)[field] = str(input[field]);
  }
  if (input.product_categories !== undefined) {
    brand.product_categories = (input.product_categories as string[]).map(str).filter(Boolean).slice(0, 30);
  }
  if (input.established_year !== undefined) {
    const year = Number(input.established_year);
    brand.established_year = Number.isFinite(year) && year > 0 ? Math.trunc(year) : null;
  }
  if (input.documents !== undefined) {
    brand.documents = (input.documents || [])
      .filter((d: any) => d && d.type && d.url)
      .map((d: any) => ({ type: str(d.type), url: str(d.url), uploaded_at: new Date() }));
  }
}

// Load a brand that belongs to the signed-in partner (404 otherwise).
async function loadOwned(userId: string, brandId: string) {
  if (!Types.ObjectId.isValid(brandId)) {
    throw new GraphQLError('Invalid brand', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const brand = await EcommBrandModel.findOne({
    _id: brandId,
    owner_user_id: new Types.ObjectId(userId),
  });
  if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
  return brand;
}

// On approval the brand owner becomes an E-commerce Manager so they can list
// products (mirrors the venue → VENUE_OWNER grant).
async function assignEcommRole(userId: Types.ObjectId) {
  const { userService } = await import('@modules/access/user/user.service');
  const u: any = await UserModel.findById(userId).select('metadata.role_keys');
  const roles = new Set<string>((u?.metadata?.role_keys ?? []) as string[]);
  roles.add('USER');
  roles.add('ECOMM_MANAGER');
  await userService.assignRoles(String(userId), Array.from(roles));
}

export const ecommBrandService = {
  // A partner may run several brands — list all of theirs.
  async listMine(userId: string) {
    const docs = await EcommBrandModel.find({ owner_user_id: new Types.ObjectId(userId) })
      .sort({ updated_at: -1, created_at: -1 })
      .limit(200);
    return docs.map(toPub);
  },

  async list(filter?: { status?: string }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    const docs = await EcommBrandModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const brand = await EcommBrandModel.findById(id);
    return brand ? toPub(brand) : null;
  },

  // Create a new brand (no id) or update an owned, still-editable one.
  async save(userId: string, brandId: string | null | undefined, input: any) {
    let brand: IEcommBrand;
    if (brandId) {
      brand = await loadOwned(userId, brandId);
      if (brand.status === 'SUBMITTED' || brand.status === 'APPROVED') {
        throw new GraphQLError('This brand is locked for review and cannot be edited', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
    } else {
      brand = await EcommBrandModel.create({ owner_user_id: new Types.ObjectId(userId) });
    }
    applyInput(brand, input);
    if (brand.status === 'REJECTED') brand.status = 'DRAFT';
    await brand.save();
    return toPub(brand);
  },

  async submit(userId: string, brandId: string) {
    const brand = await loadOwned(userId, brandId);
    if (brand.status === 'APPROVED') {
      throw new GraphQLError('This brand is already approved', { extensions: { code: 'BAD_REQUEST' } });
    }
    if (!str(brand.brand_name)) {
      throw new GraphQLError('Add a brand name before submitting', { extensions: { code: 'BAD_REQUEST' } });
    }
    if (!str(brand.description)) {
      throw new GraphQLError('Add a brand description before submitting', { extensions: { code: 'BAD_REQUEST' } });
    }
    if (!str(brand.contact_email)) {
      throw new GraphQLError('Add a contact email before submitting', { extensions: { code: 'BAD_REQUEST' } });
    }
    brand.status = 'SUBMITTED';
    brand.submitted_at = new Date();
    await brand.save();
    return toPub(brand);
  },

  async withdraw(userId: string, brandId: string) {
    const brand = await loadOwned(userId, brandId);
    if (brand.status !== 'SUBMITTED') {
      throw new GraphQLError('Only a submitted brand can be moved back to draft', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    brand.status = 'DRAFT';
    brand.submitted_at = null;
    await brand.save();
    return toPub(brand);
  },

  async approve(id: string, notes?: string, tags?: string[]) {
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    brand.status = 'APPROVED';
    brand.approved_at = new Date();
    brand.rejected_at = null;
    brand.reviewer_notes = notes ?? brand.reviewer_notes;
    if (tags) brand.tags = tags.map((tag) => tag.trim()).filter(Boolean);
    await brand.save();
    await assignEcommRole(brand.owner_user_id);
    return toPub(brand);
  },

  async reject(id: string, notes: string) {
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    brand.status = 'REJECTED';
    brand.rejected_at = new Date();
    brand.reviewer_notes = notes;
    await brand.save();
    return toPub(brand);
  },

  /** Onboarding/admin edit of any brand (e.g. completing an approval-created
   * draft by adding documents) with an optional status change. No owner-scope or
   * SUBMITTED/APPROVED lock — mirrors adminUpdateHost / adminUpdateVenue. */
  async adminUpdate(id: string, input: any, status?: string) {
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    applyInput(brand, input);
    if (status) {
      brand.status = status as any;
      if (status === 'APPROVED' && !brand.approved_at) brand.approved_at = new Date();
      if (status === 'SUBMITTED' && !brand.submitted_at) brand.submitted_at = new Date();
      if (status !== 'REJECTED') brand.rejected_at = null;
    }
    await brand.save();
    if (status === 'APPROVED') await assignEcommRole(brand.owner_user_id);
    return toPub(brand);
  },

  /** Un-approve a user's brands when their ECOMM_MANAGER role is revoked from Access. */
  async revokeApprovalForUser(userId: string) {
    const docs = await EcommBrandModel.find({ owner_user_id: new Types.ObjectId(userId), status: 'APPROVED' });
    for (const brand of docs) {
      brand.status = 'REJECTED';
      brand.rejected_at = new Date();
      brand.reviewer_notes = 'Approval revoked — seller access was removed.';
      await brand.save();
    }
    return true;
  },

  /** Draft a brand shell from an approved onboarding-meeting request so it shows
   * in the Onboarded E-Commerce Brands list (status DRAFT). Reuses an open draft. */
  async createDraftFromApproval(prefill: { userId: string; name?: string; email?: string; phone?: string }) {
    const uid = new Types.ObjectId(prefill.userId);
    let brand = await EcommBrandModel.findOne({ owner_user_id: uid, status: { $in: ['DRAFT', 'REJECTED'] } })
      .sort({ updated_at: -1, created_at: -1 });
    if (!brand) brand = await EcommBrandModel.create({ owner_user_id: uid });
    if (prefill.name && !brand.brand_name) brand.brand_name = prefill.name;
    if (prefill.name && !brand.contact_person) brand.contact_person = prefill.name;
    if (prefill.email && !brand.contact_email) brand.contact_email = prefill.email;
    if (prefill.phone && !brand.contact_phone) brand.contact_phone = prefill.phone;
    brand.status = 'DRAFT';
    await brand.save();
    return toPub(brand);
  },
};
