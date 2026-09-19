---
name: update-copy
description: Change user-facing text — a label, hint, description, placeholder, button, heading, error, toast or email line — on any Duncit surface (admin and the other portals, mWeb, native app, websites, emails), end to end, including the copy already stored in deployed databases, so nobody edits Admin > Localization by hand. Use for any ticket or ask like "update the description from X to Y", "change this text", "reword this label", "text change karo", "wording badlo", usually with a screenshot. Not for admin-entered data (city names, pod titles, CMS pages, settings values).
---

# Update copy

One ask in, the new text live on every surface and every environment out — with
no manual step for the user.

Copy lives in three places, and all three must move:

1. **The bundle** — `packages/i18n/src/bundles/<namespace>.ts` (client), or
   `server/src/services/email/email-i18n.ts` / `catalogue/catalogue.bundle.ts` (email).
2. **The server's generated copy** — `server/src/modules/platform/localization/shipped-keys.ts`.
3. **Each environment's database row**, which WINS over the bundle. The boot seed
   only creates keys, so a reworded key reaches deployed databases only through
   `COPY_REVISIONS` (step 5).

## Steps

1. **Pin down the ask.** From the text or screenshot: surface, screen, the exact
   current text, the exact new text. Take the new text verbatim — casing,
   punctuation, numbers. If it swaps a variable (`X`, `{target}`) for a fixed
   value, or contradicts nearby copy, apply it literally and flag it in the report.

2. **Find the key.** Grep a distinctive 3–5 word run of the CURRENT text with no
   apostrophes or quotes in it — the bundles use curly `’ “ ”`, so a straight `'`
   never matches. Search `packages/i18n/src/bundles/` and `server/src/services/email/`.
   Then grep the key's last segment in the surface's source to confirm it is the
   one rendered on that screen. Several keys with the same text: pick by surface,
   name the rest in the report.
   - Found only as a literal in `.ts`/`.tsx` → hardcoded (rule 38). Add a key to that
     surface's bundle namespace, switch the code to `t()` like its neighbours, go on.
     A new key needs no step 5.
   - Not in code at all → admin-entered data. Stop and tell the user which admin
     screen holds it. Never hardcode it.

3. **Edit the value only.** Keep the key, the file's typography (curly quotes and
   apostrophes), and every `{placeholder}` the `t(key, {…})` call passes — if the
   new text drops or adds one, check the call site and say so. mWeb and native share
   `MWEB_BUNDLE`, so one edit covers both (rule 27).

4. **Regenerate the server copy** (client bundle keys only; email keys are read
   directly). Node hangs under Git Bash here, so run it from PowerShell:
   ```powershell
   $p = Start-Process node -ArgumentList 'scripts/generate-shipped-keys.mjs' -NoNewWindow -PassThru; $null = $p.WaitForExit(120000)
   $p = Start-Process node -ArgumentList 'scripts/generate-shipped-keys.mjs','--check' -NoNewWindow -PassThru; $null = $p.WaitForExit(120000)
   ```
   The check must print `shipped-keys.ts matches the bundles`.

5. **Reach deployed databases.** Append the OLD English text, byte for byte, to
   `COPY_REVISIONS` in `server/src/modules/platform/localization/copy-revisions.ts`
   under the key (take it from `git show HEAD:<bundle file>` if you already edited).
   If the key already has an entry, add to its array and keep the earlier texts. On
   the next deploy, `reviseShippedCopy` moves every row still holding that text to
   the new shipped text; a row an operator edited is left alone.

6. **Sweep for quotes of the old text.** Grep the same fragment repo-wide, skipping
   `node_modules` and `.claude/worktrees`:
   - another key that quotes this copy (an admin hint describing app text) → update
     it if it is clearly the same sentence, otherwise flag it;
   - `server/src/modules/platform/e2eFlow/catalogue/*.ts` expected results → update
     them; that is shipped data behind Tech → E2E Flows, not a test;
   - test files (`__tests__`, `*.test.*`, `*.cy.tsx`) → do not edit or run them
     (test pause); list them in the report.

7. **Verify.** The step 4 check, plus a server typecheck if a server file changed
   (`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` in `server/`,
   through PowerShell `Start-Process`). No tests, no lint suites. Do not commit or
   push unless the user asks.

## Report

Key(s), old → new, files touched, the `COPY_REVISIONS` entry, and anything flagged:
placeholder changes, keys that quote this copy, tests that still assert the old
text, and a variable replaced by a fixed value. Other languages keep their old
translation until someone re-translates the key in Admin > Localization; mention
it only when the key is known to be translated.
