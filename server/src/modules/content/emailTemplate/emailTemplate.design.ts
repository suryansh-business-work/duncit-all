/**
 * The one-time design pass: every stored email onto the shipped card.
 *
 * `upgradeShippedDefaults` moves a row only when its body is one Duncit
 * shipped, so a row an admin ever saved — or one an old migration rewrote into
 * a shape no fingerprint knows — keeps its old design for good. That is the
 * right rule on an ordinary deploy, and the wrong one the day every email has
 * to look the same. Once per `EMAIL_DESIGN_VERSION` this pass puts
 *  - every shipped template on its shipped body (the subject, the footer
 *    sentence and the admin's own templates' bodies stay as they are — only
 *    the shipped design moves),
 *  - the nine system fragments on their shipped header and footer, switched on,
 *  - a header and footer on every template, an admin's own included: the
 *    general fragment when it names none.
 * Whatever it replaces is copied to `EmailDesignBackup` FIRST. Once the `done`
 * row is written the version is spent: later edits are the admin's again and
 * no boot touches them. Bump the version only with a design change that must
 * reach rows an admin edited.
 */
import { logs } from '@observability/log';
import { EmailFragmentModel } from '@modules/content/emailFragment/emailFragment.model';
import { FRAGMENT_DEFAULTS } from '@modules/content/emailFragment/emailFragment.defaults';
import { EmailTemplateModel } from './emailTemplate.model';
import { TEMPLATE_DEFAULTS } from './emailTemplate.defaults';
import { connectTemplateFragments } from './emailTemplate.chrome';
import { EmailDesignBackupModel } from './emailTemplate.design.model';
import { shippedBodyUpdate } from './emailTemplate.variables';

export const EMAIL_DESIGN_VERSION = '2026-10-27';

/** The header/footer a template with no category of its own gets. */
export const GENERAL_FRAGMENT_KEY = 'notification';

const DONE_KEY = '*';
const SHIPPED_BODY = new Map(TEMPLATE_DEFAULTS.map((tpl) => [tpl.slug, tpl.mjml]));

export interface EmailDesignResult {
  /** Slugs moved onto the shipped body. */
  templates: string[];
  /** System fragments moved onto the shipped header/footer. */
  fragments: string[];
  /** Templates that gained (or changed) their header/footer fragment. */
  connected: number;
}

/** Shipped templates whose stored body is not the shipped one, with that body. */
async function staleTemplates() {
  const rows = await EmailTemplateModel.find(
    { slug: { $in: [...SHIPPED_BODY.keys()] } },
    { slug: 1, mjml: 1, variables: 1 }
  ).lean();
  return rows.flatMap((row) => {
    const shipped = SHIPPED_BODY.get(row.slug);
    return shipped && shipped !== row.mjml ? [{ row, shipped }] : [];
  });
}

/** System fragments not on their shipped header/footer, or switched off. */
async function staleFragments() {
  const rows = await EmailFragmentModel.find(
    { key: { $in: FRAGMENT_DEFAULTS.map((seed) => seed.category) } },
    { key: 1, header_mjml: 1, footer_mjml: 1, is_active: 1 }
  ).lean();
  return rows.flatMap((row) => {
    const seed = FRAGMENT_DEFAULTS.find((candidate) => candidate.category === row.key);
    if (!seed) return [];
    const current =
      row.is_active && row.header_mjml === seed.header_mjml && row.footer_mjml === seed.footer_mjml;
    return current ? [] : [{ row, seed }];
  });
}

/** Keep the FIRST value read per row: `$setOnInsert` on a unique key. */
const keep = (version: string, kind: 'template' | 'fragment', key: string, values: object) => ({
  updateOne: {
    filter: { version, kind, key },
    update: { $setOnInsert: { version, kind, key, ...values } },
    upsert: true,
  },
});

/**
 * Apply `version` unless it already was. Returns null when there was nothing
 * to do, so the caller can fall back to the plain connect it runs every boot.
 *
 * Every write is conditional on the value it was planned from, so an admin
 * saving at the same moment wins, and two instances booting together write
 * each row once.
 */
export async function applyEmailDesign(
  version: string = EMAIL_DESIGN_VERSION
): Promise<EmailDesignResult | null> {
  if (await EmailDesignBackupModel.exists({ version, kind: 'done' })) return null;

  const [templates, fragments] = await Promise.all([staleTemplates(), staleFragments()]);
  const backups = [
    ...templates.map(({ row }) => keep(version, 'template', row.slug, { mjml: row.mjml })),
    ...fragments.map(({ row }) =>
      keep(version, 'fragment', row.key, {
        header_mjml: row.header_mjml,
        footer_mjml: row.footer_mjml,
        is_active: row.is_active,
      })
    ),
  ];
  if (backups.length) await EmailDesignBackupModel.bulkWrite(backups, { ordered: false });

  const [movedTemplates, movedFragments] = await Promise.all([
    Promise.all(
      templates.map(async ({ row, shipped }) => {
        const write = await EmailTemplateModel.updateOne(
          { slug: row.slug, mjml: row.mjml },
          shippedBodyUpdate(shipped, row.variables)
        );
        return write.modifiedCount ? [row.slug] : [];
      })
    ),
    Promise.all(
      fragments.map(async ({ row, seed }) => {
        const write = await EmailFragmentModel.updateOne(
          { key: row.key, header_mjml: row.header_mjml, footer_mjml: row.footer_mjml },
          { $set: { header_mjml: seed.header_mjml, footer_mjml: seed.footer_mjml, is_active: true } }
        );
        return write.modifiedCount ? [row.key] : [];
      })
    ),
  ]);
  // Linked only after the fragments are switched back on, so no template is
  // pointed at one that renders nothing.
  const { connected } = await connectTemplateFragments({ fallback: GENERAL_FRAGMENT_KEY });
  const result: EmailDesignResult = {
    templates: movedTemplates.flat(),
    fragments: movedFragments.flat(),
    connected,
  };

  await EmailDesignBackupModel.updateOne(
    { version, kind: 'done', key: DONE_KEY },
    {
      $setOnInsert: {
        templates: result.templates.length,
        fragments: result.fragments.length,
        connected: result.connected,
      },
    },
    { upsert: true }
  );
  logs.server.info('emailTemplate', 'applyEmailDesign', {
    version,
    templates: result.templates,
    fragments: result.fragments,
    connected: result.connected,
    msg: `Email design ${version}: ${result.templates.length} template(s) and ${result.fragments.length} fragment(s) moved to the shipped design, ${result.connected} connected to a header/footer`,
  });
  return result;
}
