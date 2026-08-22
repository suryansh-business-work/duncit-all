import { readFileSync, writeFileSync } from 'node:fs';
function edit(p, o, n) {
  let s = readFileSync(p, 'utf8');
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  const oo = o.join(eol);
  if (!s.includes(oo)) { console.error('NOT FOUND in ' + p); process.exit(1); }
  writeFileSync(p, s.replace(oo, n.join(eol)));
  console.log('ok ' + p);
}
// Tamagui's Input/TextArea does NOT read `$placeholderColor` from the theme on
// native — RN's TextInput needs the prop, and without it the hint falls through
// to the OS grey, which on Android is far too light to read.
edit('app/mobile-app/src/components/details/ProductReviews.tsx',
  ["          placeholder={t('mweb.common.shareYourExperienceOptional')}", '          minHeight={60}'],
  ["          placeholder={t('mweb.common.shareYourExperienceOptional')}", '          placeholderTextColor="$muted"', '          minHeight={60}']);
edit('app/mobile-app/src/components/status/ReportStorySheet.tsx',
  ["          placeholder={t('contentReport.detailsPlaceholder')}", '          minHeight={80}'],
  ["          placeholder={t('contentReport.detailsPlaceholder')}", '          placeholderTextColor="$muted"', '          minHeight={80}']);
