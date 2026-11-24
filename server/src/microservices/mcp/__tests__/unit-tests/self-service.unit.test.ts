/**
 * A member's own reads that live in a console's module (the wallet under
 * Finance, account health under Users & access) must still reach the member —
 * without moving, renaming or opening anything else of that console.
 */
import { buildGraphQLTools } from '../../catalog/build';
import { alsoInFor, categoriesOf, MEMBER_SELF_SERVICE_FIELDS } from '../../catalog/self-service';
import { isListedOn, refusalFor, type Viewer } from '../../catalog/visibility';
import { FIXTURE_RESOLVERS, FIXTURE_TYPE_DEFS, MEMBER, READ_WRITE, settings } from './fixtures';

const built = buildGraphQLTools({
  typeDefsByModule: {
    ...FIXTURE_TYPE_DEFS,
    financeTypeDefs: /* GraphQL */ `
      extend type Query {
        myWallet: Int
        payoutSummary: Int
      }
    `,
  },
  resolvers: FIXTURE_RESOLVERS,
});
const named = (name: string) => {
  const found = built.tools.find((tool) => tool.name === name);
  if (!found) throw new Error(`no tool ${name}`);
  return found;
};
const viewer = (over: Partial<Viewer> = {}): Viewer => ({ user: MEMBER, scopes: READ_WRITE, settings: settings(), ...over });

describe('alsoInFor', () => {
  it('offers a listed member read under the member account category too', () => {
    expect(alsoInFor('myWallet', 'QUERY', 'finance')).toEqual(['account']);
  });

  it('adds nothing for an unlisted field, a mutation, or a field already in account', () => {
    expect(alsoInFor('payoutSummary', 'QUERY', 'finance')).toBeUndefined();
    expect(alsoInFor('myWallet', 'MUTATION', 'finance')).toBeUndefined();
    expect(alsoInFor('myWallet', 'QUERY', 'account')).toBeUndefined();
  });

  it('lists only reads named like the caller’s own data', () => {
    for (const field of MEMBER_SELF_SERVICE_FIELDS) expect(field).toMatch(/^my[A-Z]/);
  });
});

describe('categoriesOf', () => {
  it('is the tool’s own category first, then the extra ones', () => {
    expect(categoriesOf({ category: 'finance', alsoIn: ['account'] })).toEqual(['finance', 'account']);
    expect(categoriesOf({ category: 'pods' })).toEqual(['pods']);
    expect(categoriesOf({ category: 'pods', alsoIn: [] })).toEqual(['pods']);
  });
});

describe('a member self-service tool in the catalog', () => {
  it('keeps its name and category (existing clients keep working)', () => {
    const wallet = named('finance_my_wallet');
    expect(wallet.category).toBe('finance');
    expect(wallet.alsoIn).toEqual(['account']);
    expect(named('finance_payout_summary').alsoIn).toBeUndefined();
  });

  it('is listed on the member app and still on the Finance console', () => {
    const wallet = named('finance_my_wallet');
    expect(isListedOn(wallet, 'app')).toBe(true);
    expect(isListedOn(wallet, 'finance')).toBe(true);
    expect(isListedOn(wallet, 'pods')).toBe(false);
  });

  it('is usable by a plain member, while the rest of Finance stays closed to them', () => {
    expect(refusalFor(named('finance_my_wallet'), viewer())).toBeNull();
    expect(refusalFor(named('finance_payout_summary'), viewer())).toBe('NO_PORTAL_ACCESS');
  });

  it('still obeys the MCP kill switches', () => {
    const wallet = named('finance_my_wallet');
    expect(refusalFor(wallet, viewer({ settings: settings({ disabled_tools: [wallet.name] }) }))).toBe('DISABLED');
    expect(refusalFor(wallet, viewer({ settings: settings({ disabled_categories: ['finance'] }) }))).toBe('DISABLED');
  });
});
