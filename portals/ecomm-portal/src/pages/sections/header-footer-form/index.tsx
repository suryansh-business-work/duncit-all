import type { SettingsTabSpec } from '../../settings/settings-form';
import HeaderFooterFields from './header-footer.form';
import { makeHeaderFooterSchema, toHeaderFooterInput, toHeaderFooterValues, type HeaderFooterValues } from './header-footer.types';

export type { HeaderFooterValues };

/** The Header & footer tab: saved through the store settings, sending only its own fields. */
export const HEADER_FOOTER_SPEC: SettingsTabSpec<HeaderFooterValues> = {
  makeSchema: makeHeaderFooterSchema,
  toValues: toHeaderFooterValues,
  toInput: toHeaderFooterInput,
  Fields: HeaderFooterFields,
};
