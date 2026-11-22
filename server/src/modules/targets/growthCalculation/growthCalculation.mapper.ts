import type { Types } from 'mongoose';
import type { IGrowthActor, IGrowthCalculation } from './growthCalculation.model';
import type { GrowthOutputs } from './growthCalculation.rules';

/** The caller a row is shaped for: whether they may edit it depends on who they are. */
export interface GrowthViewer {
  id: string;
  roles: readonly string[];
}

/** Editing and deleting belong to whoever saved the calculation, and to super admins. */
export function canEditGrowth(row: Pick<IGrowthCalculation, 'calculated_by'>, viewer: GrowthViewer): boolean {
  return viewer.roles.includes('SUPER_ADMIN') || String(row.calculated_by.user_id) === viewer.id;
}

/** A stored Decimal128 (or the string a write was handed) as the API's rupee string. */
const rupees = (value: Types.Decimal128 | string): string => value.toString();

const iso = (value: Date | null | undefined): string | null => (value ? new Date(value).toISOString() : null);

function actorOut(actor: IGrowthActor) {
  return {
    user_id: String(actor.user_id),
    name: actor.name ?? '',
    email: actor.email ?? null,
    roles: actor.roles ?? [],
  };
}

/** The outputs as the model stores them — Mongoose casts the rupee strings to Decimal128. */
export function outputsForWrite(outputs: GrowthOutputs) {
  return { per_pod: outputs.per_pod, per_city: outputs.per_city, totals: outputs.totals };
}

/** A stored calculation as the GraphQL `GrowthCalculation` type. */
export function toGrowthRow(doc: IGrowthCalculation, viewer: GrowthViewer) {
  const { per_pod: pod, per_city: city, totals } = doc;
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description ?? '',
    inputs: doc.inputs,
    per_pod: { pod_value: rupees(pod.pod_value), earnings_per_pod: rupees(pod.earnings_per_pod) },
    per_city: {
      ...city,
      monthly_gmv: rupees(city.monthly_gmv),
      monthly_earnings: rupees(city.monthly_earnings),
    },
    totals: {
      ...totals,
      monthly_gmv: rupees(totals.monthly_gmv),
      monthly_earnings: rupees(totals.monthly_earnings),
      annual_gmv: rupees(totals.annual_gmv),
      annual_earnings: rupees(totals.annual_earnings),
    },
    formula_version: doc.formula_version,
    revision: doc.revision ?? 0,
    calculated_by: actorOut(doc.calculated_by),
    last_edited_by: doc.last_edited_by ? actorOut(doc.last_edited_by) : null,
    last_edited_at: iso(doc.last_edited_at),
    duplicated_from: doc.duplicated_from ? String(doc.duplicated_from) : null,
    created_at: iso(doc.created_at) ?? '',
    updated_at: iso(doc.updated_at) ?? '',
    can_edit: canEditGrowth(doc, viewer),
  };
}
