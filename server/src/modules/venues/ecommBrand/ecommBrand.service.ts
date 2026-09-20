import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { EcommBrandModel, type IEcommBrand } from './ecommBrand.model';
import { effectiveRoleKeys } from '@modules/access/user/effective-roles';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { logs } from '@observability/log';
import { notifyEach, notifyEvent } from '@services/notify/notify.service';
import { getUrlConfigs } from '@config/url-configs';
import { policyAcceptanceService } from '@modules/content/policyAcceptance/policyAcceptance.service';
import { toPub as policyToPub } from '@modules/content/policy/policy.service';
import { brandCompletion, missingBrandSteps, type BrandStepKey } from './ecommBrand.completion';
import {
  applyConsentSignature,
  applyRazorpayInput,
  applyShiprocketInput,
  assertProvider,
  clearIntegration,
  consentContext,
  consentPub,
  currentConsentPolicy,
  integrationStatus,
  integrationsOf,
  probeBrandIntegration,
  type BrandIntegrationProvider,
} from './ecommBrand.integrations';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const toPub = (b: IEcommBrand) => ({
  id: String(b._id),
  brand_no: b.brand_no ?? null,
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
  product_commission_pct: b.product_commission_pct ?? 0,
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
  default_pickup_location_id: b.default_pickup_location_id ? String(b.default_pickup_location_id) : null,
  // Secrets stay behind: only whether each half is on file and what the vendor said.
  integrations: integrationsOf(b),
  // `current` and `available` need the published consent; the field resolver
  // adds them (`consentField`) so a list of brands reads the policy once.
  consent: consentPub(b, { available: false, current: false }),
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
      .filter((d: any) => d?.type && d?.url)
      .map((d: any) => ({ type: str(d.type), url: str(d.url), uploaded_at: new Date() }));
  }
}

/* ---- Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1) ---- */

/** ecommBrandsTable + marketplaceBrandsTable — onboarding/products brand lists. */
const ECOMM_BRAND_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['brand_no', 'brand_name', 'contact_person', 'contact_email', 'contact_phone', 'city'],
  sortFields: {
    brand_no: 'brand_no',
    brand_name: 'brand_name',
    product_categories: 'product_categories',
    city: 'city',
    status: 'status',
    submitted_at: 'submitted_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
    contact_person: 'contact_person',
    is_active: 'is_active',
    product_commission_pct: 'product_commission_pct',
    // Presence of a default pickup location: ascending lists brands without one first.
    pickup: 'default_pickup_location_id',
  },
  filterFields: {
    brand_no: { type: 'string' },
    brand_name: { type: 'string' },
    product_categories: { type: 'string' },
    contact_person: { type: 'string' },
    status: { type: 'enum' },
    is_active: { type: 'boolean' },
    city: { type: 'string' },
    product_commission_pct: { type: 'number' },
    submitted_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** myEcommBrandsTable — a partner's own brands ("Your brands" list). */
const MY_ECOMM_BRAND_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['brand_name', 'tagline'],
  sortFields: {
    brand_name: 'brand_name',
    categories: 'product_categories',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    brand_name: { type: 'string' },
    categories: { path: 'product_categories', type: 'string' },
    status: { type: 'enum' },
    is_active: { type: 'boolean' },
    updated_at: { type: 'date' },
  },
  defaultSort: { updated_at: -1 },
};

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
  // assignRoles REPLACES the whole set, so the set it is handed has to be the
  // roles the user really holds. Built from the role_keys cache, a grant would
  // delete every authoritative role the cache had drifted out of.
  const roles = new Set<string>(await effectiveRoleKeys(String(userId)));
  roles.add('USER');
  roles.add('ECOMM_MANAGER');
  await userService.assignRoles(String(userId), Array.from(roles));
}

/** The owner's own account, with only the fields a WhatsApp send reads: the
 * number lives on the user, never on the brand's contact details. */
const waRecipient = (userId: Types.ObjectId) =>
  UserModel.findById(userId).select('auth.phone communication.whatsapp').lean();

/** What a required step is called in a refusal — the wizard's own step names. */
const STEP_NAME: Record<BrandStepKey, string> = {
  details: 'Brand details',
  business: 'Business & legal',
  address: 'Address',
  payout: 'Payout',
  categories: 'Product categories',
  media: 'Brand media (logo)',
  documents: 'Documents',
  integration: 'Integration (ShipRocket and Razorpay must both be connected)',
  review: 'Review',
  consent: 'Final consent (sign the Brand Consent)',
};

/** Refuse a submission or an approval while a required wizard step is undone. */
async function assertReadyForReview(brand: IEcommBrand, who: 'submitted' | 'approved') {
  const policy = await currentConsentPolicy();
  const missing = missingBrandSteps(brand, consentContext(brand, policy));
  if (missing.length === 0) return;
  throw new GraphQLError(
    `This brand cannot be ${who} yet — finish: ${missing.map((key) => STEP_NAME[key]).join('; ')}`,
    { extensions: { code: 'BAD_REQUEST', missing_steps: missing } }
  );
}

/** Where the owner opens this brand in the Partners console. */
async function brandUrl(brand: IEcommBrand) {
  const { partnersUrl } = await getUrlConfigs();
  return `${partnersUrl}/ecomm-brand/${String(brand._id)}/edit`;
}

/** The owner, on both channels, for one lifecycle event. Best effort — never fails the mutation. */
async function notifyOwner(brand: IEcommBrand, event: string, params: string[], vars: Record<string, string>) {
  try {
    await notifyEvent({
      event,
      // Keyed on the moment, not the brand: a brand rejected and resubmitted
      // is told again, which the per-entity duplicate index would otherwise stop.
      entityId: `${String(brand._id)}:${Date.now()}`,
      user: await waRecipient(brand.owner_user_id),
      name: brand.contact_person,
      params,
      email: brand.contact_email ?? '',
      vars,
    });
  } catch (error) {
    logs.server.warn('ecommBrand', 'notifyOwner', { error, event, brandId: String(brand._id) });
  }
}

/** Every Products Manager, so a submission is never waiting unnoticed. Email only — an internal notice. */
async function notifyReviewers(brand: IEcommBrand) {
  const { productsUrl } = await getUrlConfigs();
  const managers = await UserModel.find({ 'metadata.role_keys': 'PRODUCTS_MANAGER', 'metadata.status': 'ACTIVE' })
    .select('auth.email profile.first_name')
    .lean();
  const owner = await UserModel.findById(brand.owner_user_id).select('profile.first_name profile.last_name').lean();
  const ownerName =
    [owner?.profile?.first_name, owner?.profile?.last_name].filter(Boolean).join(' ') || brand.contact_person || '';
  for (const manager of managers) {
    const to = String(manager.auth?.email ?? '');
    if (!to) continue;
    try {
      await sendEmail({
        to,
        subject: `Brand awaiting review: ${brand.brand_name}`,
        template: 'ecomm-brand-review-requested',
        category: 'notification',
        vars: {
          name: String(manager.profile?.first_name ?? ''),
          brand: brand.brand_name,
          owner: ownerName,
          category: (brand.product_categories ?? []).join(', '),
          review_url: `${productsUrl}/ecomm/brands/${String(brand._id)}`,
        },
      });
    } catch (error) {
      logs.server.warn('ecommBrand', 'notifyReviewers', { error, to, brandId: String(brand._id) });
    }
  }
}

/**
 * Take a brand out for good: its pickup locations go with it, the owner loses
 * the seller role when it was their last brand, and they are told. The
 * product guard is the caller's: an approved brand with products is never
 * deleted from here.
 */
async function removeBrand(brand: IEcommBrand, reason: string) {
  await BrandPickupLocationModel.deleteMany({ brand_id: brand._id });
  await EcommBrandModel.deleteOne({ _id: brand._id });
  const remaining = await EcommBrandModel.countDocuments({ owner_user_id: brand.owner_user_id });
  if (remaining === 0) await removeUserRole(String(brand.owner_user_id), 'ECOMM_MANAGER');
  await notifyOwner(brand, 'ECOMM_BRAND_DELETED', [brand.contact_person, brand.brand_name], { reason });
  return true;
}

/** Strip a single role from a user (used on brand hard-delete when they have no
 * remaining brand). No-op if the user is gone or never held the role. */
async function removeUserRole(userId: string, role: string) {
  const roles = await effectiveRoleKeys(userId);
  if (!roles.includes(role)) return;
  const { userService } = await import('@modules/access/user/user.service');
  await userService.assignRoles(userId, roles.filter((r) => r !== role));
}

export const ecommBrandService = {
  /** Grant the e-commerce role directly (meeting-approval path). The drafted
   * brand may still be DRAFT — product listing stays gated on the brand's own
   * approval, so the early grant only unlocks the ECOMM studio + partner UI. */
  async grantEcommRole(userId: string) {
    await assignEcommRole(new Types.ObjectId(userId));
  },

  // A partner may run several brands — list all of theirs.
  async listMine(userId: string) {
    const docs = await EcommBrandModel.find({ owner_user_id: new Types.ObjectId(userId) })
      .sort({ updated_at: -1, created_at: -1 })
      .limit(200);
    return docs.map(toPub);
  },

  async list(filter?: { status?: string; activeOnly?: boolean }) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    // marketplaceBrands passes activeOnly so deactivated brands vanish from the
    // storefront; the onboarding list keeps showing them (to reactivate).
    if (filter?.activeOnly) q.is_active = { $ne: false };
    const docs = await EcommBrandModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  /** Server-side table page for the myEcommBrandsTable query. The owner scope
   * goes through runTableQuery's baseFilter ($and-merged), so client filters
   * can never widen it to another partner's brands. */
  async myTable(userId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IEcommBrand>(
      EcommBrandModel,
      { owner_user_id: new Types.ObjectId(userId) },
      input,
      MY_ECOMM_BRAND_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Server-side table page for the ecommBrandsTable query (onboarding/admin). */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IEcommBrand>(
      EcommBrandModel,
      {},
      input,
      ECOMM_BRAND_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Server-side table page for the marketplaceBrandsTable query. Mirrors the
   * marketplaceBrands sibling: deactivated brands never surface, and status
   * defaults to APPROVED unless the client filters on status itself. */
  async marketplaceTable(input?: TableQueryInput | null) {
    const scope: Record<string, unknown> = { is_active: { $ne: false } };
    const hasStatusFilter = (input?.filters ?? []).some((f) => f.field === 'status');
    if (!hasStatusFilter) scope.status = 'APPROVED';
    const { docs, total, page, page_size } = await runTableQuery<IEcommBrand>(
      EcommBrandModel,
      scope,
      input,
      ECOMM_BRAND_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
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
    // Every required wizard step, both integrations connected, the consent
    // signed against its current wording — the same bar approval applies.
    await assertReadyForReview(brand, 'submitted');
    brand.status = 'SUBMITTED';
    brand.submitted_at = new Date();
    brand.rejected_at = null;
    await brand.save();
    await notifyOwner(brand, 'ECOMM_BRAND_SUBMITTED', [brand.contact_person, brand.brand_name], {
      brand_url: await brandUrl(brand),
    });
    await notifyReviewers(brand);
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
    // The change-request path re-runs this on brands that are already approved
    // (so the owner keeps their role), and an admin re-approves to edit notes or
    // tags. Both stay allowed; the message only goes out on the transition,
    // because it carries no entity for the duplicate index to key on.
    const wasApproved = brand.status === 'APPROVED';
    // A brand goes live only once the reviewer can see every section is done:
    // required steps, both vendor connections and the signed consent. A brand
    // approved before the wizard existed is re-approved without the bar, so a
    // change request on it still lands.
    if (!wasApproved) await assertReadyForReview(brand, 'approved');
    brand.status = 'APPROVED';
    brand.approved_at = new Date();
    brand.rejected_at = null;
    brand.reviewer_notes = notes ?? brand.reviewer_notes;
    if (tags) brand.tags = tags.map((tag) => tag.trim()).filter(Boolean);
    await brand.save();
    await assignEcommRole(brand.owner_user_id);
    // Approving the brand is what the partner is waiting on, so its warehouses
    // register here rather than in a second manual step they never see. It
    // talks to ShipRocket, so it is best-effort — a failure is recorded on the
    // warehouse (and shown in both portals) instead of failing the approval.
    const { brandPickupLocationService } = await import(
      '@modules/venues/brandPickupLocation/brandPickupLocation.service'
    );
    await brandPickupLocationService.registerBrandWarehouses(String(brand._id));
    if (!wasApproved) {
      // THIS is where the brand is onboarded — the interview only drafted the
      // record — so `ecomm-onboarding-approved` goes out here rather than on the
      // meeting decision. Sequential (notifyEach) because both messages reach
      // the same person and AiSensy rate-limits the campaign API.
      const categories = (brand.product_categories ?? []).join(', ');
      const { partnersUrl } = await getUrlConfigs();
      const recipient = await waRecipient(brand.owner_user_id);
      const email = brand.contact_email ?? '';
      await notifyEach([
        {
          event: 'ECOMM_ONBOARDING_APPROVED',
          user: recipient,
          name: brand.contact_person,
          // The template's second value is the partner-portal login address,
          // which is the same address this email is going to.
          params: [brand.contact_person, email],
          email,
          vars: { portal_url: partnersUrl },
        },
        {
          event: 'ECOMM_BRAND_ADDED',
          user: recipient,
          name: brand.contact_person,
          params: [brand.contact_person, brand.brand_name, categories],
          email,
        },
      ]);
    }
    return toPub(brand);
  },

  /** Brand-level Duncit commission %% on product sales (0 = inherit the
   * per-product pct, then the global default). Onboarded-brand console. */
  async setCommission(id: string, commissionPct: number) {
    if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
      throw new GraphQLError('product_commission_pct must be between 0 and 100', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    brand.product_commission_pct = commissionPct;
    await brand.save();
    return toPub(brand);
  },

  async reject(id: string, notes: string) {
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    brand.status = 'REJECTED';
    brand.rejected_at = new Date();
    brand.reviewer_notes = notes;
    await brand.save();
    await notifyOwner(brand, 'ECOMM_BRAND_REJECTED', [brand.contact_person, brand.brand_name, notes], {
      brand_url: await brandUrl(brand),
    });
    return toPub(brand);
  },

  /** Deactivate/reactivate a brand. A deactivated brand (is_active=false) and its
   * products disappear from the marketplace + pod product picker without touching
   * status/roles (reversible). Mirrors venue/host setActive + owner email. */
  async setActive(id: string, active: boolean) {
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    // Nothing changed, so nobody is told: an account message carries no entity
    // for the WhatsApp duplicate index to key on, and the partner's own toggle
    // would otherwise bill a message every time it is pressed.
    if (brand.is_active === active) return toPub(brand);
    brand.is_active = active;
    await brand.save();

    // Sent whether or not there is an address: sendEmail records a FAILED row
    // for an empty recipient, so a status change nobody was told about is
    // visible in Emails > Logs instead of leaving no trace at all.
    const slug = active ? 'brand-activated' : 'brand-deactivated';
    try {
      await sendEmail({
        to: brand.contact_email ?? '',
        subject: active ? 'Your brand is now active' : 'Your brand has been deactivated',
        template: slug,
        category: 'notification',
        vars: {
          contact_person: brand.contact_person ?? '',
          brand_name: brand.brand_name ?? '',
          status: active ? 'active' : 'deactivated',
        },
      });
    } catch (err) {
      logs.server.warn('ecommBrand', 'setActive', {
        error: err,
        slug,
        msg: `email failed for ${slug}`,
      });
    }

    await whatsappService.send({
      event: active ? 'ECOMM_ACCOUNT_REACTIVATED' : 'ECOMM_ACCOUNT_SUSPENDED',
      user: await waRecipient(brand.owner_user_id),
      name: brand.contact_person,
      params: [brand.contact_person],
    });

    return toPub(brand);
  },

  /** Partner self-service pause: same reversible is_active flip as setActive,
   * but scoped to a brand the caller owns (partners portal "Temporarily
   * deactivate" toggle). Orders already placed are untouched. */
  async setActiveOwned(userId: string, brandId: string, active: boolean) {
    await loadOwned(userId, brandId);
    return this.setActive(brandId, active);
  },

  /** Developer hard-delete: permanently removes a brand everywhere, its pickup
   * locations, and revokes the owner's ECOMM_MANAGER role when it was their last
   * brand. BLOCKS when the brand still has products (remove them first). */
  async deleteBrand(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new GraphQLError('Invalid brand id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const brand = await EcommBrandModel.findById(id);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });

    const productCount = await InventoryProductModel.countDocuments({ brand_id: brand._id, ownership: 'BRAND' });
    if (productCount > 0) {
      throw new GraphQLError(
        `This brand still has ${productCount} product(s). Remove them before deleting.`,
        { extensions: { code: 'BAD_REQUEST' } }
      );
    }

    await BrandPickupLocationModel.deleteMany({ brand_id: brand._id });
    await EcommBrandModel.deleteOne({ _id: brand._id });

    // Drop the owner's ECOMM_MANAGER role only when this was their last brand.
    const remaining = await EcommBrandModel.countDocuments({ owner_user_id: brand.owner_user_id });
    if (remaining === 0) await removeUserRole(String(brand.owner_user_id), 'ECOMM_MANAGER');
    return true;
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
    if (status === 'APPROVED') {
      await assignEcommRole(brand.owner_user_id);
      // The other approval path — same best-effort warehouse registration, so
      // it does not matter which screen approved the brand.
      const { brandPickupLocationService } = await import(
        '@modules/venues/brandPickupLocation/brandPickupLocation.service'
      );
      await brandPickupLocationService.registerBrandWarehouses(String(brand._id));
    }
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

  /** One of the caller's own brands, at any status — what the wizard opens. */
  async myBrand(userId: string, brandId: string) {
    return toPub(await loadOwned(userId, brandId));
  },

  /** The published Brand Consent, as the wizard's last step and the review page read it. */
  async consentPolicy() {
    const policy = await currentConsentPolicy();
    return policy ? policyToPub(policy) : null;
  },

  /**
   * Save a brand's own vendor credential and check it right away. Allowed on a
   * draft, a rejected brand and a LIVE brand (credentials get rotated) — but
   * not while the brand sits in the review queue, where the reviewer must see
   * what was submitted.
   */
  async connectIntegration(userId: string, brandId: string, provider: BrandIntegrationProvider, input: any) {
    assertProvider(provider);
    const brand = await loadOwned(userId, brandId);
    if (brand.status === 'SUBMITTED') {
      throw new GraphQLError('Withdraw the brand from review before changing its integrations', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (provider === 'SHIPROCKET') applyShiprocketInput(brand, input);
    else applyRazorpayInput(brand, input);
    const status = await probeBrandIntegration(brand, provider);
    await brand.save();
    return status;
  },

  /** Check the saved credential again — the vendor's answer today, not the one on file. */
  async recheckIntegration(userId: string, brandId: string, provider: BrandIntegrationProvider) {
    assertProvider(provider);
    const brand = await loadOwned(userId, brandId);
    const status = await probeBrandIntegration(brand, provider);
    await brand.save();
    return status;
  },

  /** Forget the credential. The brand is no longer connected, so it cannot be submitted until it is again. */
  async disconnectIntegration(userId: string, brandId: string, provider: BrandIntegrationProvider) {
    assertProvider(provider);
    const brand = await loadOwned(userId, brandId);
    if (brand.status === 'SUBMITTED') {
      throw new GraphQLError('Withdraw the brand from review before changing its integrations', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    clearIntegration(brand, provider);
    await brand.save();
    return integrationStatus(brand, provider);
  },

  /** Products portal: the reviewer's own check of a submitted brand's credential. */
  async reviewIntegration(brandId: string, provider: BrandIntegrationProvider) {
    assertProvider(provider);
    if (!Types.ObjectId.isValid(brandId)) {
      throw new GraphQLError('Invalid brand', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const brand = await EcommBrandModel.findById(brandId);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    const status = await probeBrandIntegration(brand, provider);
    await brand.save();
    return status;
  },

  /**
   * Sign the Brand Consent by typing a name. The brand keeps the signature and
   * the hash of the wording; the Legal acceptance log gets its row, so an
   * auditor reads it beside every other acceptance.
   */
  async signConsent(userId: string, brandId: string, signedName: string) {
    const brand = await loadOwned(userId, brandId);
    const policy = await currentConsentPolicy();
    if (!policy) {
      throw new GraphQLError('No Brand Consent is published yet — there is nothing to sign', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    applyConsentSignature(brand, policy, signedName);
    await brand.save();
    await policyAcceptanceService.recordBrandConsent(userId, policy);
    return consentPub(brand, consentContext(brand, policy));
  },

  /** Partner self-service delete. An approved brand that still sells is deactivated instead, never deleted. */
  async deleteMine(userId: string, brandId: string) {
    const brand = await loadOwned(userId, brandId);
    const productCount = await InventoryProductModel.countDocuments({ brand_id: brand._id, ownership: 'BRAND' });
    if (brand.status === 'APPROVED' && productCount > 0) {
      throw new GraphQLError(
        `This brand still has ${productCount} product(s). Deactivate it instead, or remove the products first.`,
        { extensions: { code: 'BAD_REQUEST' } }
      );
    }
    return removeBrand(brand, '');
  },

  /** Products portal delete, with the reason the owner is sent. Same product guard as the partner's. */
  async adminDelete(brandId: string, notes: string) {
    if (!Types.ObjectId.isValid(brandId)) {
      throw new GraphQLError('Invalid brand id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const brand = await EcommBrandModel.findById(brandId);
    if (!brand) throw new GraphQLError('Brand not found', { extensions: { code: 'NOT_FOUND' } });
    const productCount = await InventoryProductModel.countDocuments({ brand_id: brand._id, ownership: 'BRAND' });
    if (productCount > 0) {
      throw new GraphQLError(
        `This brand still has ${productCount} product(s). Deactivate it, or remove the products before deleting.`,
        { extensions: { code: 'BAD_REQUEST' } }
      );
    }
    return removeBrand(brand, str(notes));
  },

  /* ---- Field resolvers' helpers: the consent-aware halves of a public brand ---- */

  /** `consent` with `current`/`available` filled in against the published wording. */
  async consentField(parent: { consent: ReturnType<typeof consentPub> }) {
    const policy = await currentConsentPolicy();
    return { ...parent.consent, ...consentContext(parent, policy) };
  },

  /** Wizard progress for a public brand — what the Your brands table and the review inbox show. */
  async completionField(parent: Parameters<typeof brandCompletion>[0] & { consent: ReturnType<typeof consentPub> }) {
    const policy = await currentConsentPolicy();
    return brandCompletion(parent, consentContext(parent, policy));
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
