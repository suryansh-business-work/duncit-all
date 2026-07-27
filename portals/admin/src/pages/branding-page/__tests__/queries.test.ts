import { describe, expect, it } from 'vitest';
import { argumentsAt, fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  BRANDING,
  OCCASIONAL_ICONS,
  UPDATE_BRANDING,
  UPDATE_OCCASIONAL_ICONS,
  emptyBrandingForm,
  type BrandingFormState,
  type OccasionalIconRow,
  type PlatformAssetFields,
  type PlatformPrefix,
} from '../queries';

const PLATFORM_PREFIXES: readonly PlatformPrefix[] = ['mweb', 'mobile', 'portals'];

/** `satisfies` keeps these lists exhaustive: tsc fails on a renamed or new key. */
const PLATFORM_ASSET_SUFFIXES = Object.keys({
  favicon_url: 0,
  logo_url: 0,
  splash_url: 0,
  splash_type: 0,
} satisfies Record<keyof PlatformAssetFields, number>);

const OCCASIONAL_ICON_ROW_FIELDS = Object.keys({
  slug: 0,
  label: 0,
  starts_at: 0,
  ends_at: 0,
  icon_url: 0,
  fallback_icon: 0,
  is_active: 0,
  sort_order: 0,
} satisfies Record<keyof OccasionalIconRow, number>);

const formKeys = Object.keys(emptyBrandingForm) as (keyof BrandingFormState)[];

describe('BRANDING', () => {
  it('is the parameterless Branding query — the name UPDATE_BRANDING refetches by', () => {
    expect(operationOf(BRANDING)).toEqual({ name: 'Branding', type: 'query' });
    expect(variablesOf(BRANDING)).toEqual({});
    expect(fieldsAt(BRANDING)).toEqual(['branding']);
  });

  it('selects every key the page copies into the form state', () => {
    const selected = fieldsAt(BRANDING, 'branding');
    for (const key of formKeys) {
      expect(selected).toContain(key);
    }
  });

  it('also returns fields the form does not own, so they survive a save', () => {
    const selected = fieldsAt(BRANDING, 'branding');
    expect(selected).toContain('home_show_all_vibe_categories');
    expect(selected).toContain('updated_at');
    expect(formKeys).not.toContain('home_show_all_vibe_categories');
    expect(formKeys).not.toContain('updated_at');
  });

  it('selects the four asset fields for each of the three platforms', () => {
    const selected = fieldsAt(BRANDING, 'branding');
    for (const prefix of PLATFORM_PREFIXES) {
      for (const suffix of PLATFORM_ASSET_SUFFIXES) {
        expect(selected).toContain(`${prefix}_${suffix}`);
      }
    }
  });

  it('expands the all-vibe icon layout instead of returning an opaque blob', () => {
    expect(fieldsAt(BRANDING, 'branding', 'home_all_vibe_icon_layout')).toEqual([
      'position',
      'width',
      'height',
    ]);
  });
});

describe('UPDATE_BRANDING', () => {
  it('takes one UpdateBrandingInput and passes it straight through', () => {
    expect(operationOf(UPDATE_BRANDING)).toEqual({ name: 'UpdateBranding', type: 'mutation' });
    expect(variablesOf(UPDATE_BRANDING)).toEqual({ input: 'UpdateBrandingInput!' });
    expect(argumentsAt(UPDATE_BRANDING, 'updateBranding')).toEqual({ input: '$input' });
  });

  it('returns exactly what the query returns, so the saved form rehydrates', () => {
    expect(fieldsAt(UPDATE_BRANDING, 'updateBranding')).toEqual(fieldsAt(BRANDING, 'branding'));
  });
});

describe('OCCASIONAL_ICONS', () => {
  it('reads the icons through branding and is named for its refetch', () => {
    expect(operationOf(OCCASIONAL_ICONS)).toEqual({ name: 'OccasionalIcons', type: 'query' });
    expect(variablesOf(OCCASIONAL_ICONS)).toEqual({});
    expect(fieldsAt(OCCASIONAL_ICONS)).toEqual(['branding']);
    expect(fieldsAt(OCCASIONAL_ICONS, 'branding')).toEqual(['occasional_icons']);
  });

  it('selects every OccasionalIconRow field, including the bundled fallback name', () => {
    const selected = fieldsAt(OCCASIONAL_ICONS, 'branding', 'occasional_icons');
    for (const field of OCCASIONAL_ICON_ROW_FIELDS) {
      expect(selected).toContain(field);
    }
    expect(selected).toContain('fallback_icon');
  });

  it('does not drag the whole branding document along with the icons', () => {
    expect(fieldsAt(OCCASIONAL_ICONS, 'branding')).not.toContain('app_name');
  });
});

describe('UPDATE_OCCASIONAL_ICONS', () => {
  it('replaces the whole list in one call', () => {
    expect(operationOf(UPDATE_OCCASIONAL_ICONS)).toEqual({
      name: 'UpdateOccasionalIcons',
      type: 'mutation',
    });
    expect(variablesOf(UPDATE_OCCASIONAL_ICONS)).toEqual({ input: '[OccasionalIconInput!]!' });
  });

  it('returns the same row shape the query does', () => {
    expect(fieldsAt(UPDATE_OCCASIONAL_ICONS, 'updateOccasionalIcons')).toEqual(
      fieldsAt(OCCASIONAL_ICONS, 'branding', 'occasional_icons'),
    );
  });
});

describe('emptyBrandingForm', () => {
  it('defaults the splash type to IMAGE on every platform', () => {
    expect(emptyBrandingForm.mweb_splash_type).toBe('IMAGE');
    expect(emptyBrandingForm.mobile_splash_type).toBe('IMAGE');
    expect(emptyBrandingForm.portals_splash_type).toBe('IMAGE');
  });

  it('ships the MUI default primary and the home tagline as seeded copy', () => {
    expect(emptyBrandingForm.primary_color).toBe('#1976d2');
    expect(emptyBrandingForm.home_header_tagline).toBe('It All Starts Here!');
  });

  it('leaves the icon layout null so an unset icon is not positioned', () => {
    expect(emptyBrandingForm.home_all_vibe_icon_layout).toBeNull();
  });

  it('blanks every other field, so a fresh form never saves stray defaults', () => {
    const seeded = new Set([
      'primary_color',
      'home_header_tagline',
      'mweb_splash_type',
      'mobile_splash_type',
      'portals_splash_type',
      'home_all_vibe_icon_layout',
    ]);
    const stray = formKeys.filter((key) => !seeded.has(key) && emptyBrandingForm[key] !== '');
    expect(stray).toEqual([]);
  });
});
