// Regenerates src/data.ts from country-region-data (a devDependency). Run with
// `node scripts/gen-data.mjs` from packages/geo after bumping the dataset.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pkg from 'country-region-data';

const { allCountries } = pkg;
const trimmed = allCountries.map(([name, iso, regions]) => [
  name,
  iso,
  (regions || []).map(([regionName, regionCode]) => [regionName, regionCode]),
]);

const out =
  '// Auto-generated from country-region-data — do not edit by hand.\n' +
  '// Regenerate with: node scripts/gen-data.mjs\n' +
  'export type CountryTuple = readonly [name: string, isoCode: string, states: readonly (readonly [name: string, isoCode: string])[]];\n\n' +
  `export const COUNTRIES: readonly CountryTuple[] = ${JSON.stringify(trimmed)};\n`;

const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data.ts');
writeFileSync(target, out);
console.log(`wrote ${trimmed.length} countries to src/data.ts`);
