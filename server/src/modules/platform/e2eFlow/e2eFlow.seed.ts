import { logs } from '@observability/log';
import { E2eFlowModel } from './e2eFlow.model';
import { E2E_FLOW_CATALOGUE } from './catalogue';
import type { CatalogueSubFlow } from './catalogue/catalogue.types';

/** Names are matched loosely, so "user login" typed by hand is the same sub flow as "User Login". */
const nameKey = (name: string) => name.trim().toLowerCase();

const toSubFlow = (sub: CatalogueSubFlow) => ({
  name: sub.name,
  description: sub.description,
  steps: sub.steps.map(([action, expected]) => ({ action, expected })),
});

/**
 * Seed every flow documented in the codebase catalogue.
 *
 * Additive only: a flow missing by name is created, and a flow that exists gets
 * just the sub flows it is missing, appended after its own. Nothing already in
 * the database is overwritten, so a sub flow a tech admin has edited keeps their
 * steps across every redeploy.
 */
export async function seedE2eFlowCatalogue(): Promise<void> {
  const existing = await E2eFlowModel.find({}, 'name sub_flows.name').lean();
  const byName = new Map(existing.map((flow) => [nameKey(flow.name), flow]));

  const inserts = [];
  const appends = [];
  for (const flow of E2E_FLOW_CATALOGUE) {
    const found = byName.get(nameKey(flow.name));
    if (!found) {
      inserts.push({ ...flow, sub_flows: flow.sub_flows.map(toSubFlow), created_by: 'system' });
      continue;
    }
    const known = new Set((found.sub_flows ?? []).map((sub) => nameKey(sub.name)));
    const missing = flow.sub_flows.filter((sub) => !known.has(nameKey(sub.name)));
    if (missing.length > 0) {
      appends.push(
        E2eFlowModel.updateOne(
          { _id: found._id },
          { $push: { sub_flows: { $each: missing.map(toSubFlow) } } }
        )
      );
    }
  }

  if (inserts.length > 0) await E2eFlowModel.insertMany(inserts, { ordered: false });
  await Promise.all(appends);
  if (inserts.length + appends.length > 0) {
    logs.server.info('e2eFlow', 'seed', { created: inserts.length, extended: appends.length });
  }
}
