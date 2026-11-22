/**
 * Pre-commit lint (see .husky/pre-commit).
 *
 * Vendored third-party trees are left out before ESLint runs. eslint.code.config.mjs
 * already ignores them, but lint-staged would still put every staged path on one
 * command line, and an upstream update of open-wa-server (~1,400 .ts files) is far
 * past the Windows command-line limit ("The command line is too long").
 */
const VENDORED = ['portals/crm/open-wa-server/'];

const ESLINT =
  'eslint -c eslint.code.config.mjs --suppressions-location eslint-code-suppressions.json --max-warnings 0 --no-warn-ignored --pass-on-unpruned-suppressions';

const isVendored = (file) => {
  const path = file.replaceAll('\\', '/');
  return VENDORED.some((dir) => path.includes(`/${dir}`) || path.startsWith(dir));
};

export default {
  '*.{ts,tsx}': (files) => {
    const own = files.filter((file) => !isVendored(file));
    return own.length ? [`${ESLINT} ${own.map((file) => JSON.stringify(file)).join(' ')}`] : [];
  },
};
