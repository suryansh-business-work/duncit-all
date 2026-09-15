import { GraphQLError } from 'graphql';
import { DEFAULT_LAUNCH_TARGET, LocationModel } from './location.model';
import { locationLaunchSchema, type LocationLaunchInput } from './location.validator';
import { validate } from '@utils/validate';
import {
  escapedSearchRegex,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    location_id: d.location_id,
    location_name: d.location_name,
    country: d.country ?? 'India',
    country_code: d.country_code ?? 'IN',
    state: d.state ?? '',
    state_code: d.state_code ?? '',
    city: d.city ?? d.location_name ?? '',
    location_image: d.location_image,
    location_pincode: d.location_pincode,
    location_zones: (d.location_zones ?? []).map((z: any) => ({
      zone_name: z.zone_name,
      zone_code: z.zone_code ?? '',
      pincode: z.pincode ?? '',
      // Hidden (not in the GraphQL schema) — lets the LocationZone.active_club_count
      // field resolver key into the per-locality counts by its parent city.
      _location_id: String(d._id),
    })),
    is_active: !!d.is_active,
    // A city saved before the launch fields existed was already live.
    is_launched: d.is_launched ?? true,
    launch_target: d.launch_target ?? DEFAULT_LAUNCH_TARGET,
    whatsapp_group_url: d.whatsapp_group_url ?? '',
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

function notFound(): never {
  throw new GraphQLError('Location not found', { extensions: { code: 'NOT_FOUND' } });
}

/** The launch fields the caller actually sent, validated. A null or missing
 * field is left out, so an update never resets what it did not mention. */
async function launchFields(
  input: Record<string, unknown>
): Promise<{ [K in keyof LocationLaunchInput]?: NonNullable<LocationLaunchInput[K]> }> {
  const data = await validate<LocationLaunchInput>(locationLaunchSchema, input);
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== null && value !== undefined)
  );
}

/** Allowlists for the shared table engine (locationsTable — DUNCIT TABLE CONTRACT v1).
 * Search spans the same paths the legacy list() search matched. */
const LOCATION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [
    'location_name',
    'country',
    'state',
    'city',
    'location_id',
    'location_pincode',
    'location_zones.zone_name',
    'location_zones.pincode',
  ],
  sortFields: {
    location_name: 'location_name',
    image: 'location_image',
    city: 'city',
    state: 'state',
    zones: 'location_zones.zone_name',
    country: 'country',
    is_active: 'is_active',
    // Sortable but not filterable: cities saved before the switch existed have
    // no stored value, so a "launched = yes" match would miss them.
    is_launched: 'is_launched',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    is_active: { type: 'boolean' },
    image: { path: 'location_image', type: 'string' },
    country: { type: 'string' },
    state: { type: 'string' },
    city: { type: 'string' },
    zones: { path: 'location_zones.zone_name', type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { location_name: 1 },
};

export const locationService = {
  async list(filter?: { search?: string; is_active?: boolean }) {
    const q: any = {};
    if (filter?.search) {
      // Built once, from ESCAPED input: `new RegExp(filter.search)` compiled the
      // caller's string as a pattern, so a search of `.*` matched every row and
      // a crafted one could pin the event loop against the collection.
      const rx = escapedSearchRegex(filter.search);
      q.$or = [
        { location_name: rx },
        { country: rx },
        { state: rx },
        { city: rx },
        { location_id: rx },
        { location_pincode: rx },
        { 'location_zones.zone_name': rx },
        { 'location_zones.pincode': rx },
      ];
    }
    if (filter?.is_active !== undefined) q.is_active = filter.is_active;
    const docs = await LocationModel.find(q).sort({ location_name: 1 });
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the locationsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      LocationModel,
      {},
      input,
      LOCATION_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    const d = await LocationModel.findById(id);
    return toPub(d);
  },

  /** Several cities in one read, for a list keyed by location id. */
  async listByIds(ids: readonly string[]) {
    const docs = await LocationModel.find({ _id: { $in: ids } });
    return docs.map(toPub);
  },

  async create(input: {
    location_name: string;
    location_id?: string;
    country: string;
    country_code: string;
    state: string;
    state_code: string;
    city: string;
    location_image: string;
    location_pincode: string;
    location_zones?: { zone_name: string; zone_code?: string; pincode?: string }[];
    is_active?: boolean | null;
    is_launched?: boolean | null;
    launch_target?: number | null;
    whatsapp_group_url?: string | null;
  }) {
    const launch = await launchFields(input);
    const location_id = (input.location_id?.trim() || slugify(input.location_name));
    const dupe = await LocationModel.findOne({ location_id });
    if (dupe) {
      throw new GraphQLError('Location with that ID already exists', {
        extensions: { code: 'CONFLICT' },
      });
    }
    const doc = await LocationModel.create({
      location_id,
      location_name: input.location_name.trim(),
      country: input.country.trim(),
      country_code: input.country_code.trim().toUpperCase(),
      state: input.state.trim(),
      state_code: input.state_code.trim().toUpperCase(),
      city: input.city.trim(),
      location_image: input.location_image,
      location_pincode: input.location_pincode.trim(),
      location_zones: input.location_zones ?? [],
      ...launch,
    });
    return toPub(doc);
  },

  async update(
    id: string,
    input: {
      location_name?: string;
      country?: string;
      country_code?: string;
      state?: string;
      state_code?: string;
      city?: string;
      location_image?: string;
      location_pincode?: string;
      location_zones?: { zone_name: string; zone_code?: string; pincode?: string }[];
      is_active?: boolean;
      is_launched?: boolean | null;
      launch_target?: number | null;
      whatsapp_group_url?: string | null;
    }
  ) {
    const { is_launched, launch_target, whatsapp_group_url } = await launchFields(input);
    const doc = await LocationModel.findById(id);
    if (!doc) notFound();
    if (input.location_name !== undefined) doc.location_name = input.location_name.trim();
    if (input.country !== undefined) doc.country = input.country.trim();
    if (input.country_code !== undefined) doc.country_code = input.country_code.trim().toUpperCase();
    if (input.state !== undefined) doc.state = input.state.trim();
    if (input.state_code !== undefined) doc.state_code = input.state_code.trim().toUpperCase();
    if (input.city !== undefined) doc.city = input.city.trim();
    if (input.location_image !== undefined) doc.location_image = input.location_image;
    if (input.location_pincode !== undefined) doc.location_pincode = input.location_pincode.trim();
    if (input.location_zones !== undefined) doc.location_zones = input.location_zones as any;
    if (input.is_active !== undefined) doc.is_active = input.is_active;
    if (is_launched !== undefined) doc.is_launched = is_launched;
    if (launch_target !== undefined) doc.launch_target = launch_target;
    if (whatsapp_group_url !== undefined) doc.whatsapp_group_url = whatsapp_group_url;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await LocationModel.findById(id);
    if (!doc) notFound();
    await doc!.deleteOne();
    return true;
  },
};
