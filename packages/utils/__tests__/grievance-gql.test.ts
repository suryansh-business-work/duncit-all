import { describe, expect, it } from 'vitest';
import {
  GRIEVANCE_OFFICER_SDL,
  SUBMIT_GRIEVANCE_SDL,
  type PublicGrievanceOfficer,
  type SubmittedGrievance,
} from '../src/grievance-gql';

/**
 * The one document shape every consumer can take: a single named operation,
 * a single root field, one flat block of leaf fields and nothing else. gql()
 * on the apps parses it and the website posts it verbatim as a fetch body, so
 * a stray token, a second operation, a nested block or an unbalanced brace
 * would break a surface at runtime. Anchored at both ends on purpose.
 */
const ONE_FLAT_OPERATION =
  /^\s*(mutation|query) \w+(?:\([^()]*\))? \{\s+\w+(?:\([^()]*\))? \{(?:\s+\w+)+\s+\}\s+\}\s*$/;

/** 'mutation' | 'query' when the document has exactly that shape, else undefined. */
const flatOperationKind = (sdl: string): string | undefined => ONE_FLAT_OPERATION.exec(sdl)?.[1];

/**
 * The leaf fields a one-level document selects, in document order. Both
 * grievance documents select a single flat block, so the innermost braces
 * hold exactly the fields the caller reads back.
 */
const selectedFields = (sdl: string): string[] =>
  sdl
    .slice(sdl.lastIndexOf('{') + 1, sdl.indexOf('}'))
    .split(/\s+/)
    .filter(Boolean);

/**
 * The keys each TypeScript shape promises, spelled out so `tsc` fails the
 * moment a field is added to the interface without being added here — which
 * is how the test below forces the SDL to keep selecting what the apps read.
 */
const OFFICER_KEYS: Record<keyof PublicGrievanceOfficer, true> = {
  name: true,
  email: true,
  phone: true,
  address: true,
};
const SUBMITTED_KEYS: Record<keyof SubmittedGrievance, true> = {
  id: true,
  grievance_no: true,
  status: true,
};

/**
 * The server's GrievanceTicket and GrievanceOfficer types, mirrored from
 * server/src/modules/content/grievance/grievance.schema.ts as the spec. A field
 * the server does not expose is a request it rejects outright, and the ticket's
 * resolution trail is staff-only — never echoed to whoever raised the complaint.
 */
const SERVER_TICKET_FIELDS = new Set([
  'id',
  'grievance_no',
  'source',
  'name',
  'email',
  'phone',
  'address',
  'subject',
  'description',
  'status',
  'resolution',
  'resolved_at',
  'handled_by_name',
  'created_at',
  'updated_at',
]);
const STAFF_ONLY_TICKET_FIELDS = new Set(['resolution', 'resolved_at', 'handled_by_name']);
const SERVER_OFFICER_FIELDS = new Set(['name', 'email', 'phone', 'address', 'updated_at']);

describe('SUBMIT_GRIEVANCE_SDL', () => {
  // Two contracts meet on this line: the server declares the argument as a
  // non-null `SubmitGrievanceInput!` (a nullable variable is rejected at
  // validation), and the website posts `variables: { input }`, so the variable
  // must be called `$input` and go straight into the root field.
  it('raises the grievance through the open submitGrievance mutation, handing the input straight through', () => {
    expect(SUBMIT_GRIEVANCE_SDL).toContain('mutation SubmitGrievance($input: SubmitGrievanceInput!)');
    expect(SUBMIT_GRIEVANCE_SDL).toContain('submitGrievance(input: $input)');
  });

  it('reads back exactly what SubmittedGrievance promises, in that order', () => {
    expect(selectedFields(SUBMIT_GRIEVANCE_SDL)).toEqual(Object.keys(SUBMITTED_KEYS));
    expect(selectedFields(SUBMIT_GRIEVANCE_SDL)).toEqual(['id', 'grievance_no', 'status']);
  });

  // The reference number is what the person leaves with — the website gates its
  // success state on `grievance_no` — while the legal team's resolution and
  // handler stay on the staff side of the ticket.
  it('asks the server only for public ticket fields — the reference number among them, never the resolution trail', () => {
    const fields = selectedFields(SUBMIT_GRIEVANCE_SDL);
    expect(fields).toContain('grievance_no');
    expect(fields.filter((field) => !SERVER_TICKET_FIELDS.has(field))).toEqual([]);
    expect(fields.filter((field) => STAFF_ONLY_TICKET_FIELDS.has(field))).toEqual([]);
  });

  // A write must be a mutation: a `query` reaching for submitGrievance fails
  // validation on the server, and gql() would parse a document with extra
  // tokens into something the apps never meant to send.
  it('is one flat, well-formed mutation, so gql() on the apps and the website fetch body both accept it', () => {
    expect(flatOperationKind(SUBMIT_GRIEVANCE_SDL)).toBe('mutation');
  });
});

describe('GRIEVANCE_OFFICER_SDL', () => {
  // Publishing the officer is the whole point of the record, so the query is
  // public: no variables, no input, nothing for an anonymous caller to supply.
  it('reads the public grievanceOfficer query with no variables', () => {
    expect(GRIEVANCE_OFFICER_SDL).toContain('query GrievanceOfficer {');
    expect(GRIEVANCE_OFFICER_SDL).toContain('grievanceOfficer {');
    expect(GRIEVANCE_OFFICER_SDL).not.toContain('$');
  });

  it('selects exactly the PublicGrievanceOfficer block every surface publishes, identity then contact', () => {
    expect(selectedFields(GRIEVANCE_OFFICER_SDL)).toEqual(Object.keys(OFFICER_KEYS));
    expect(selectedFields(GRIEVANCE_OFFICER_SDL)).toEqual(['name', 'email', 'phone', 'address']);
  });

  // The website treats a blank `name` as "no officer published yet", so the
  // name must be asked for; the server type also carries `updated_at`, but the
  // public block quotes the officer, not the audit trail.
  it('asks the server only for officer fields — the name the website publishes on, never the audit timestamp', () => {
    const fields = selectedFields(GRIEVANCE_OFFICER_SDL);
    expect(fields).toContain('name');
    expect(fields.filter((field) => !SERVER_OFFICER_FIELDS.has(field))).toEqual([]);
    expect(fields).not.toContain('updated_at');
  });

  it('is one flat, well-formed query, so gql() on the apps and the build-time fetch both accept it', () => {
    expect(flatOperationKind(GRIEVANCE_OFFICER_SDL)).toBe('query');
  });
});
