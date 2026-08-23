import { writeFileSync } from "node:fs";

/** Each package's i18n module, now three lines over the shared factory. */
const PKGS = [
  ["packages/ui/src/i18n/useTranslation.ts", "UI_BUNDLE", "UI_FALLBACK_FLAT", "the shared UI components", "ui"],
  ["packages/location/src/i18n/useTranslation.ts", "LOCATION_BUNDLE", "LOCATION_FALLBACK_FLAT", "the shared location picker", "location"],
  ["packages/ad-request-form/src/i18n/useTranslation.ts", "AD_REQUEST_BUNDLE", "AD_REQUEST_FALLBACK_FLAT", "the shared ad-request form", "adRequest"],
  ["packages/media-picker/src/i18n/useTranslation.ts", "MEDIA_BUNDLE", "MEDIA_FALLBACK_FLAT", "the media picker", "media"],
  ["packages/pod-form/src/i18n/useTranslation.ts", "POD_FORM_BUNDLE", "PODFORM_FALLBACK_FLAT", "the shared pod form", "podForm"],
];

for (const [file, bundle, flat, what, ns] of PKGS) {
  writeFileSync(
    file,
    `import {
  createBundleTranslation,
  createTranslator,
  flattenCatalogue,
  ${bundle},
} from '@duncit/app-settings';

/**
 * This package's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * The copy lives in @duncit/i18n with every other surface's, so the admin panel
 * can offer each key for translation — and it is compiled into whichever build
 * imports this package, which is what renders offline and before the API
 * answers.
 */
export const ${flat} = flattenCatalogue(${bundle});

/** The \`t\` a component in this package receives. */
export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Translate inside ${what}.
 *
 * The bundle is layered over the host surface's rather than left to it: every
 * portal and mWeb mount the provider with their own bundle, none of which knows
 * \`${ns}.*\`. See \`createBundleTranslation\` for why that matters.
 */
export const useTranslation = createBundleTranslation(${bundle});

/**
 * A provider-free translator over the bundled copy, for the code in this
 * package that runs outside the React tree.
 */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: ${flat},
}).t as Translate;
`,
    "utf8",
  );
  console.log("wrote", file);
}
