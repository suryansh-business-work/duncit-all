import { GraphQLError } from 'graphql';
import { ClubModel } from '@modules/pods/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { SliderModel, type ISlider, type SliderScope } from './slider.model';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function resolveTargetMeta(
  kind: 'POD' | 'CLUB' | null | undefined,
  id: any
): Promise<{ slug: string | null; title: string | null; parent_slug: string | null }> {
  if (!kind || !id) return { slug: null, title: null, parent_slug: null };
  if (kind === 'POD') {
    const pod = await PodModel.findById(id, { pod_id: 1, pod_title: 1, club_id: 1 });
    if (!pod) return { slug: null, title: null, parent_slug: null };
    let parentSlug: string | null = null;
    if (pod.club_id) {
      const club = await ClubModel.findById(pod.club_id, { club_id: 1 });
      parentSlug = club?.club_id ?? null;
    }
    return {
      slug: pod.pod_id ?? null,
      title: pod.pod_title ?? null,
      parent_slug: parentSlug,
    };
  }
  const club = await ClubModel.findById(id, { club_id: 1, club_name: 1 });
  return club
    ? { slug: club.club_id ?? null, title: club.club_name ?? null, parent_slug: null }
    : { slug: null, title: null, parent_slug: null };
}

function buildEffectiveLinkUrl(
  linkType: 'INTERNAL' | 'EXTERNAL',
  kind: 'POD' | 'CLUB' | null | undefined,
  target: { slug: string | null; parent_slug: string | null },
  externalUrl: string
): string {
  if (linkType === 'EXTERNAL') return externalUrl || '';
  if (kind === 'POD' && target.slug && target.parent_slug) {
    return `/club/${target.parent_slug}/pod/${target.slug}`;
  }
  if (kind === 'CLUB' && target.slug) {
    return `/club/${target.slug}`;
  }
  return '';
}

async function toPub(s: ISlider) {
  const linkType = s.link_type ?? 'EXTERNAL';
  const target = await resolveTargetMeta(s.link_target_kind, s.link_target_id);
  return {
    id: String(s._id),
    slider_id: s.slider_id,
    title: s.title,
    description: s.description ?? '',
    media_url: s.media_url,
    media_type: s.media_type,
    link_type: linkType,
    link_target_kind: s.link_target_kind ?? null,
    link_target_id: s.link_target_id ? String(s.link_target_id) : null,
    link_target_slug: target.slug,
    link_target_title: target.title,
    link_target_parent_slug: target.parent_slug,
    link_url: s.link_url ?? '',
    effective_link_url: buildEffectiveLinkUrl(linkType, s.link_target_kind, target, s.link_url ?? ''),
    scope: s.scope,
    super_category_slug: s.super_category_slug ?? null,
    location_id: s.location_id ? String(s.location_id) : null,
    zone_name: s.zone_name ?? null,
    sort_order: s.sort_order,
    starts_at: s.starts_at ? s.starts_at.toISOString() : null,
    ends_at: s.ends_at ? s.ends_at.toISOString() : null,
    is_active: s.is_active,
    created_at: s.created_at.toISOString(),
    updated_at: s.updated_at.toISOString(),
  };
}

const validateScope = (input: {
  scope: SliderScope;
  location_id?: string | null;
  zone_name?: string | null;
}) => {
  if (input.scope === 'LOCATION' && !input.location_id) {
    throw new GraphQLError('location_id is required for LOCATION scope', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (input.scope === 'ZONE') {
    if (!input.location_id)
      throw new GraphQLError('location_id is required for ZONE scope', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    if (!input.zone_name)
      throw new GraphQLError('zone_name is required for ZONE scope', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
  }
};

function validateLink(input: any) {
  if (input.link_type === 'INTERNAL') {
    if (!input.link_target_kind || !input.link_target_id) {
      throw new GraphQLError('Internal link needs a pod or club selection', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  }
  if (input.link_type === 'EXTERNAL' && input.link_url) {
    try {
      const url = new URL(input.link_url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only http/https URLs are allowed');
      }
    } catch {
      throw new GraphQLError('External link must be a valid http(s) URL', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
  }
}

export const sliderService = {
  async list(filter?: {
    scope?: SliderScope;
    super_category_slug?: string | null;
    location_id?: string;
    zone_name?: string;
    is_active?: boolean;
    search?: string;
  }) {
    const q: any = {};
    if (filter?.scope) q.scope = filter.scope;
    if (filter?.super_category_slug) {
      q.$or = [
        { super_category_slug: filter.super_category_slug },
        { super_category_slug: null },
      ];
    }
    if (filter?.location_id) q.location_id = filter.location_id;
    if (filter?.zone_name) q.zone_name = filter.zone_name;
    if (typeof filter?.is_active === 'boolean') q.is_active = filter.is_active;
    if (filter?.search) q.title = { $regex: filter.search, $options: 'i' };
    const docs = await SliderModel.find(q).sort({ sort_order: 1, created_at: -1 });
    return Promise.all(docs.map(toPub));
  },

  async getById(id: string) {
    const doc = await SliderModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async create(input: any) {
    validateScope(input);
    validateLink(input);
    const slider_id =
      (input.slider_id && slugify(input.slider_id)) ||
      `${slugify(input.title)}-${Date.now().toString(36)}`;
    const dup = await SliderModel.findOne({ slider_id });
    if (dup)
      throw new GraphQLError('slider_id already exists', {
        extensions: { code: 'CONFLICT' },
      });

    const linkType = input.link_type ?? (input.link_url ? 'EXTERNAL' : 'EXTERNAL');
    const doc = await SliderModel.create({
      slider_id,
      title: input.title,
      description: input.description ?? '',
      media_url: input.media_url,
      media_type: input.media_type ?? 'IMAGE',
      link_type: linkType,
      link_target_kind: linkType === 'INTERNAL' ? input.link_target_kind ?? null : null,
      link_target_id: linkType === 'INTERNAL' ? input.link_target_id ?? null : null,
      link_url: linkType === 'EXTERNAL' ? input.link_url ?? '' : '',
      scope: input.scope,
      super_category_slug: input.super_category_slug
        ? String(input.super_category_slug).toLowerCase()
        : null,
      location_id: input.scope === 'GLOBAL' ? null : input.location_id ?? null,
      zone_name: input.scope === 'ZONE' ? input.zone_name : null,
      sort_order: input.sort_order ?? 0,
      starts_at: input.starts_at ? new Date(input.starts_at) : null,
      ends_at: input.ends_at ? new Date(input.ends_at) : null,
      is_active: input.is_active ?? true,
    });
    return toPub(doc);
  },

  async update(id: string, input: any) {
    const doc = await SliderModel.findById(id);
    if (!doc) throw new GraphQLError('Slider not found', { extensions: { code: 'NOT_FOUND' } });

    let nextLocationId: any;
    if (input.location_id === undefined) {
      nextLocationId = doc.location_id ? String(doc.location_id) : null;
    } else {
      nextLocationId = input.location_id;
    }
    const next = {
      scope: input.scope ?? doc.scope,
      location_id: nextLocationId,
      zone_name: input.zone_name === undefined ? doc.zone_name : input.zone_name,
    };
    validateScope(next);

    if (input.link_type !== undefined) {
      validateLink({
        link_type: input.link_type,
        link_target_kind:
          input.link_target_kind ?? (doc.link_target_kind as any) ?? null,
        link_target_id: input.link_target_id ?? doc.link_target_id ?? null,
        link_url: input.link_url ?? doc.link_url ?? '',
      });
    }

    const fields = [
      'title',
      'description',
      'media_url',
      'media_type',
      'link_url',
      'scope',
      'sort_order',
      'is_active',
    ] as const;
    for (const f of fields) if (input[f] !== undefined) (doc as any)[f] = input[f];

    if (input.link_type !== undefined) doc.link_type = input.link_type;
    if (input.link_target_kind !== undefined) doc.link_target_kind = input.link_target_kind;
    if (input.link_target_id !== undefined) doc.link_target_id = input.link_target_id;

    if (doc.link_type === 'EXTERNAL') {
      doc.link_target_kind = null;
      doc.link_target_id = null;
    } else if (doc.link_type === 'INTERNAL') {
      doc.link_url = '';
    }

    if (input.scope !== undefined || input.location_id !== undefined) {
      doc.location_id = next.scope === 'GLOBAL' ? null : next.location_id;
    }
    if (input.scope !== undefined || input.zone_name !== undefined) {
      doc.zone_name = next.scope === 'ZONE' ? next.zone_name ?? null : null;
    }
    if (input.starts_at !== undefined)
      doc.starts_at = input.starts_at ? new Date(input.starts_at) : null;
    if (input.ends_at !== undefined)
      doc.ends_at = input.ends_at ? new Date(input.ends_at) : null;
    if (input.super_category_slug !== undefined) {
      doc.super_category_slug = input.super_category_slug
        ? String(input.super_category_slug).toLowerCase()
        : null;
    }

    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const res = await SliderModel.findByIdAndDelete(id);
    return !!res;
  },
};
