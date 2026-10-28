import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import { SETTING_BOUNDS } from '../../../../shared/limits';
import { countRule } from '../../../components/countRule';
import type { LiteAdminCity, LiteCityInput } from '../../../graphql/catalogue';

/** The tabs of the web app's "Explore local events", in display order. */
export const CITY_REGIONS = ['ASIA_PACIFIC', 'EUROPE', 'AFRICA', 'NORTH_AMERICA', 'SOUTH_AMERICA'] as const;
export type CityRegion = (typeof CITY_REGIONS)[number];

export interface CityFormValues {
  name: string;
  slug: string;
  country: string;
  region: CityRegion;
  cover_url: string;
  featured: boolean;
  /** Kept as text in the form; parsed on submit. */
  sort_order: string;
  is_active: boolean;
}


const isBlankOrHttpUrl = (value: string): boolean => {
  if (value === '') return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const emptyCityValues = (): CityFormValues => ({ name: '', slug: '', country: '', region: 'ASIA_PACIFIC', cover_url: '', featured: false, sort_order: '0', is_active: true });

export const cityValuesFrom = (city: LiteAdminCity): CityFormValues => ({
  name: city.name,
  slug: city.slug,
  country: city.country,
  region: city.region,
  cover_url: city.cover_url ?? '',
  featured: city.featured,
  sort_order: String(city.sort_order),
  is_active: city.is_active,
});

export const toCityInput = (values: CityFormValues): LiteCityInput => ({
  name: values.name,
  slug: values.slug || null,
  country: values.country || null,
  region: values.region,
  cover_url: values.cover_url || null,
  featured: values.featured,
  sort_order: values.sort_order === '' ? 0 : Number(values.sort_order),
  is_active: values.is_active,
});

export const makeCitySchema = (t: Translate) => {
  const name = t('litePortal.common.name');
  const max = (field: string, limit: number) => t('litePortal.validation.max', { vars: { field, max: limit } });
  return z.object({
    name: z.string().trim().min(1, t('litePortal.validation.required', { vars: { field: name } })).max(60, max(name, 60)),
    slug: z.string().trim().max(80, max(t('litePortal.common.slug'), 80)),
    country: z.string().trim().max(60, max(t('litePortal.cities.country'), 60)),
    region: z.enum(CITY_REGIONS),
    cover_url: z.string().trim().refine(isBlankOrHttpUrl, t('litePortal.validation.url', { vars: { field: t('litePortal.cities.cover') } })),
    featured: z.boolean(),
    sort_order: countRule(t, t('litePortal.common.sortOrder'), SETTING_BOUNDS.sortOrder, true),
    is_active: z.boolean(),
  });
};
