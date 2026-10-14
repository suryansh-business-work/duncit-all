/// <reference types="cypress" />
import { expectRefused, signInRunMember, SIGNED_OUT } from '../../../support/access-steps';
import { memberId } from '../../../support/api-apps';
import { runAccount } from '../../../support/run-account';

/**
 * Privacy (GDPR) — "Download my data" is the caller's own data and nothing
 * else, and never a credential. Scenario map: Apps › Privacy (GDPR) ("Download
 * my data export").
 *
 * privacy.export.ts exportUserData: the account itself, plus every record
 * whose subject field (user_id, owner_id, author_id, …) is the caller, with any
 * key that looks like a secret (password, hash, secret, token, salt) dropped at
 * every depth. The run account filed support tickets in 06, so the export has
 * records as well as the account.
 */

const EXPORT = `query E2eMyDataExport { myDataExport }`;
const SECRET_KEY = /password|hash|secret|token|salt/i;

interface ExportGroup {
  collection: string;
  field: string;
  records: unknown[];
}

interface DataExport {
  account: { _id: string; auth?: { email?: string } };
  records: ExportGroup[];
}

/** Every key at any depth of `value`. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
}

/** Every value at a dotted path, stepping into arrays on the way. */
function valuesAt(value: unknown, path: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value.flatMap((item) => valuesAt(item, path));
  if (path.length === 0) return [value];
  if (!value || typeof value !== 'object') return [];
  const [head = '', ...rest] = path;
  return valuesAt((value as Record<string, unknown>)[head], rest);
}

describe('API · My data export is mine alone and carries no secret', { testIsolation: false }, () => {
  let memberToken = '';
  let ownId = '';

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
      memberId(token).then((id) => {
        ownId = id;
      });
    });
  });

  it('PV-01 a signed-out caller gets no export', () => {
    cy.gqlRaw(EXPORT, {}, { token: null }).then((body) => expectRefused('myDataExport', body, SIGNED_OUT));
  });

  it('PV-02 the export is the signed-in member’s own account, and every record points at them', () => {
    cy.gql<{ myDataExport: string }>(EXPORT, {}, { token: memberToken }).then(({ myDataExport }) => {
      const data = JSON.parse(myDataExport) as DataExport;
      expect(data.account._id, 'the account is the caller').to.equal(ownId);
      expect(data.account.auth?.email, 'with their own address').to.equal(runAccount().email.toLowerCase());
      expect(data.records, 'the tickets 06 filed are exported').to.have.length.greaterThan(0);
      data.records.forEach((group) => {
        group.records.forEach((record) => {
          const owners = valuesAt(record, group.field.split('.')).map(String);
          expect(owners, `${group.collection}.${group.field} names the caller`).to.include(ownId);
        });
      });
    });
  });

  it('PV-03 no key in the export looks like a credential', () => {
    cy.gql<{ myDataExport: string }>(EXPORT, {}, { token: memberToken }).then(({ myDataExport }) => {
      const leaked = keysOf(JSON.parse(myDataExport)).filter((key) => SECRET_KEY.test(key));
      expect(leaked, 'secret-looking keys').to.deep.equal([]);
    });
  });
});
