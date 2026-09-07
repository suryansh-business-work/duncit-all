/**
 * Where an "Expense Related From" type finds its entities.
 *
 * A configuration row names a source; this registry is what a source name
 * means. The indirection is the whole point of the feature: Finance adds a
 * type from Settings and points it at a list the platform already knows, and
 * nothing ships. Only a genuinely NEW kind of thing to spend money on — one no
 * collection here holds — needs a line of server code.
 *
 * It is a registry and not a collection name on the config row because a name
 * typed into an admin form must never become a mongo collection this server
 * will query: that is an admin field that reads any document in the database.
 */
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { ClubAdminProfileModel } from '@modules/clubs/clubAdminProfile/clubAdminProfile.model';

/** One row in the picker: what it is called, and the id the expense stores. */
export interface ExpenseRelatedEntity {
  id: string;
  name: string;
  /** The human reference beside the name — DUN-POD-4821, VEN-000001, a slug. */
  reference: string;
}

interface EntitySource {
  /** Free-text search across the fields a person would type. */
  search(term: string, limit: number): Promise<ExpenseRelatedEntity[]>;
  /** One entity by document id — how a saved expense re-reads its own name. */
  byId(id: string): Promise<ExpenseRelatedEntity | null>;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const rx = (term: string) => new RegExp(escape(term.trim()), 'i');

/**
 * Builds a source from a mongoose model plus the two fields that name a row.
 *
 * Every entity a person picks looks the same on screen — a name and a
 * reference — so the five sources differ only in which model and which two
 * paths. Writing them out five times is how the pod list ends up sorted
 * differently from the venue list for no reason anybody can name.
 */
function fieldSource(
  Model: { find: (filter: unknown) => any; findById: (id: string) => any },
  nameField: string,
  refField: string,
  extraSearchFields: string[] = []
): EntitySource {
  const project = `${nameField} ${refField}`;
  const toEntity = (doc: Record<string, unknown> | null): ExpenseRelatedEntity | null => {
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: String(doc[nameField] ?? ''),
      reference: String(doc[refField] ?? ''),
    };
  };
  return {
    async search(term, limit) {
      const fields = [nameField, refField, ...extraSearchFields];
      const filter = term ? { $or: fields.map((field) => ({ [field]: rx(term) })) } : {};
      const docs = await Model.find(filter).select(project).sort({ _id: -1 }).limit(limit).lean();
      return (docs as Record<string, unknown>[])
        .map(toEntity)
        .filter((row): row is ExpenseRelatedEntity => row !== null);
    },
    async byId(id) {
      if (!Types.ObjectId.isValid(id)) return null;
      const doc = await Model.findById(id).select(project).lean();
      return toEntity(doc as Record<string, unknown> | null);
    },
  };
}

/**
 * The lists a RELATED_FROM_TYPE can point at.
 *
 * Club Admin and Host are their own onboarding records rather than the user
 * document: an expense is attributed to somebody in that ROLE, and the record
 * carries the permanent CADM-/HOST- reference Finance quotes.
 */
const SOURCES: Record<string, EntitySource> = {
  POD: fieldSource(PodModel, 'pod_title', 'pod_id'),
  CLUB: fieldSource(ClubModel, 'club_name', 'club_id'),
  VENUE: fieldSource(VenueModel, 'venue_name', 'venue_no', ['city']),
  CLUB_ADMIN: fieldSource(ClubAdminProfileModel, 'full_name', 'club_admin_no'),
  HOST: fieldSource(HostModel, 'full_name', 'host_no'),
};

/** Every source name a configuration row may point at, for the settings form. */
export const EXPENSE_ENTITY_SOURCES = Object.keys(SOURCES);

/**
 * Search one source. An unknown source answers with nothing rather than
 * throwing: a type mis-configured in Settings should show an empty picker the
 * admin can see and fix, not take the expense form down with it.
 */
export function searchEntities(
  source: string,
  term: string,
  limit: number
): Promise<ExpenseRelatedEntity[]> {
  return SOURCES[source]?.search(term, limit) ?? Promise.resolve([]);
}

/** One entity by id — used to re-label a saved expense when it is reopened. */
export function findEntity(source: string, id: string): Promise<ExpenseRelatedEntity | null> {
  return SOURCES[source]?.byId(id) ?? Promise.resolve(null);
}
