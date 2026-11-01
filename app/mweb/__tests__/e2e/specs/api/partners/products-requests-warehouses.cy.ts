/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
  type Refusal,
} from '../../../support/access-steps';
import { expectAnswer, expectEachRefused, productFlagOn, productRefusal, whenShopOn } from '../../../support/api-partners';
import { NO_ID } from '../../../support/staff-operations';

/**
 * The Products console's request desks and pickup addresses: Brand / Product
 * Request (/ecomm/brand-request, ECOMM_PORTAL), Pickup Address Approval
 * (/warehouse-approval, WAREHOUSE_REVIEW) — both SUPER_ADMIN, CITY_ADMIN,
 * PRODUCTS_MANAGER in approval/approval.resolver.ts, outside the product flag —
 * and Duncit pickup addresses (/settings/warehouses, ADMIN_RW, behind the
 * flag). A city admin is the grantable role. No change request is filed (a
 * filed one could be approved onto a live brand), no request is decided (every
 * decision names a request that does not exist, one already decided, or one
 * of the wrong kind — each refused before the claim), and no pickup address is
 * saved or deleted (a save registers it with ShipRocket). Scenario map:
 * Products › Ecomm Requests (denied roles, request history), Warehouse
 * Approval (queue, already reviewed, denied roles), Pickup Locations (list,
 * usage, primary cannot be disabled, unknown address).
 */

const CHANGES = `query E2eErChanges($kind: String) { myEcommChangeRequests(kind: $kind) { id type status } }`;
const SUBMIT = `mutation E2eErSubmit($input: EcommChangeRequestInput!) { submitEcommChangeRequest(input: $input) { id } }`;
const QUEUE = `query E2eWaQueue($status: ApprovalStatus) { warehouseApprovalRequests(status: $status) { id type status } }`;
const APPROVE = `mutation E2eWaApprove($id: ID!) { approveWarehouseRequest(id: $id, notes: "e2e") { id } }`;
const DENY = `mutation E2eWaDeny($id: ID!) { denyWarehouseRequest(id: $id, notes: "e2e") { id } }`;
const PICKUPS = `query E2ePlList { brandPickupLocations(owner_kind: DUNCIT) { id owner_kind review_status is_default is_active } }`;
const USAGE = `query E2ePlUsage($id: ID!) { brandPickupLocationUsage(id: $id) { count products { id channel } } }`;
const SET_ACTIVE = `mutation E2ePlActive($id: ID!) { setBrandPickupLocationActive(id: $id, active: false) { id is_active } }`;
const SET_DEFAULT = `mutation E2ePlDefault($id: ID!) { setDefaultBrandPickupLocation(id: $id) { id } }`;
const DELETE = `mutation E2ePlDelete($id: ID!) { deleteBrandPickupLocation(id: $id) }`;
const SAVE = `mutation E2ePlSave { saveBrandPickupLocation(input: { owner_kind: DUNCIT, nickname: "e2e refused" }) { id } }`;
const MINE = `query E2ePlMine($id: ID!) { myBrandPickupLocations(brand_doc_id: $id) { id } }`;

const REQUEST_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Request not found' };
const PICKUP_NOT_FOUND: Refusal = { code: 'NOT_FOUND', message: 'Pickup location not found' };
const CHANGE_INPUT = { kind: 'BRAND', target_id: NO_ID, target_name: 'e2e', details: [], payload: '{}' };

interface Row {
  id: string;
  type: string;
  status: string;
}
interface Pickup {
  id: string;
  owner_kind: string;
  review_status: string;
  is_default: boolean;
  is_active: boolean;
}

describe('API · Products request desks and pickup addresses', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';
  let flagOn = false;

  const rows = (query: string, field: string, variables: Record<string, unknown>) =>
    cy.gql<Record<string, Row[]>>(query, variables, { token: cityAdminToken }).then((data) => data[field]);

  before(() => {
    signInRunMember().then((token) => {
      memberToken = token;
    });
    productFlagOn().then((on) => {
      flagOn = on;
    });
    signInRunAs(['CITY_ADMIN']).then((token) => {
      cityAdminToken = token;
    });
    revokeRunRoles(['CITY_ADMIN']);
    signInRunAs(['ECOMM_MANAGER']).then((token) => {
      partnerToken = token;
    });
  });

  after(() => {
    revokeRunRoles(['ECOMM_MANAGER']);
  });

  it('ER-01 the request history lists only the asked kind of change request', () => {
    [
      ['BRAND', 'ECOMM_BRAND_CHANGE'],
      ['PRODUCT', 'ECOMM_PRODUCT_CHANGE'],
    ].forEach(([kind, type]) => {
      rows(CHANGES, 'myEcommChangeRequests', { kind }).each((row: Row) => expect(row.type, `${kind} history`).to.equal(type));
    });
  });

  it('ER-02 a brand partner, a member and a signed-out caller can neither read nor raise change requests', () => {
    const callers = [
      [null, SIGNED_OUT],
      [memberToken, ACCESS_DENIED],
      [partnerToken, ACCESS_DENIED],
    ] as const;
    expectEachRefused('myEcommChangeRequests', CHANGES, {}, callers);
    expectEachRefused('submitEcommChangeRequest', SUBMIT, { input: CHANGE_INPUT }, callers);
  });

  it('WA-01 the pickup approval queue lists only pickup requests, at the asked status', () => {
    rows(QUEUE, 'warehouseApprovalRequests', { status: 'PENDING' }).each((row: Row) => {
      expect(row.type).to.equal('WAREHOUSE_APPROVAL');
      expect(row.status).to.equal('PENDING');
    });
    expectEachRefused('warehouseApprovalRequests', QUEUE, {}, [
      [memberToken, ACCESS_DENIED],
      [partnerToken, ACCESS_DENIED],
    ]);
    expectEachRefused('approveWarehouseRequest', APPROVE, { id: NO_ID }, [[partnerToken, ACCESS_DENIED]]);
  });

  it('WA-02 a decision needs a request that exists, is a pickup request and is still pending', function () {
    [
      ['approveWarehouseRequest', APPROVE],
      ['denyWarehouseRequest', DENY],
    ].forEach(([field, query]) => expectEachRefused(field, query, { id: NO_ID }, [[cityAdminToken, REQUEST_NOT_FOUND]]));
    rows(CHANGES, 'myEcommChangeRequests', {}).then((changes) => {
      rows(QUEUE, 'warehouseApprovalRequests', { status: 'APPROVED' }).then((decided) => {
        if (!changes[0] && !decided[0]) this.skip();
        if (changes[0]) {
          expectEachRefused('approveWarehouseRequest', APPROVE, { id: changes[0].id }, [
            [cityAdminToken, { code: 'BAD_USER_INPUT', message: 'Not a pickup address approval request' }],
          ]);
        }
        if (decided[0]) {
          expectEachRefused('denyWarehouseRequest', DENY, { id: decided[0].id }, [
            [cityAdminToken, { code: 'BAD_USER_INPUT', message: 'This request has already been reviewed' }],
          ]);
          rows(QUEUE, 'warehouseApprovalRequests', { status: 'APPROVED' })
            .then((after) => after.map((r) => r.id))
            .should('include', decided[0].id);
        }
      });
    });
  });

  it('PL-01 Duncit pickup addresses are Duncit-owned and approved, and refused to everyone but catalogue staff', () => {
    expectEachRefused('brandPickupLocations', PICKUPS, {}, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    expectEachRefused('saveBrandPickupLocation', SAVE, {}, [
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    cy.gqlRaw(PICKUPS, {}, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'brandPickupLocations', body, (b) => {
        expect(b.errors).to.be.undefined;
        const list = b.data?.brandPickupLocations as Pickup[];
        list.forEach((p) => {
          expect(p.owner_kind).to.equal('DUNCIT');
          expect(p.review_status).to.equal('APPROVED');
        });
        expect(list.filter((p) => p.is_default), 'at most one primary').to.have.length.at.most(1);
      }),
    );
  });

  it('PL-02 each address’s usage names the products shipping from it, and the primary one cannot be disabled', function () {
    if (!flagOn) {
      expectEachRefused('brandPickupLocationUsage', USAGE, { id: NO_ID }, [[cityAdminToken, productRefusal(false, PICKUP_NOT_FOUND)]]);
      return;
    }
    cy.gql<{ brandPickupLocations: Pickup[] }>(PICKUPS, {}, { token: cityAdminToken }).then(({ brandPickupLocations }) => {
      brandPickupLocations.forEach((p) => {
        cy.gql<{ brandPickupLocationUsage: { count: number; products: unknown[] } }>(USAGE, { id: p.id }, { token: cityAdminToken }).then(
          ({ brandPickupLocationUsage: usage }) => expect(usage.products, 'named products').to.have.length(Math.min(usage.count, 100)),
        );
      });
      const primary = brandPickupLocations.find((p) => p.is_default);
      if (!primary) this.skip();
      expectEachRefused('setBrandPickupLocationActive', SET_ACTIVE, { id: primary?.id }, [
        [cityAdminToken, { code: 'BAD_REQUEST', message: 'This is the primary pickup address — make another one primary before disabling it' }],
      ]);
      cy.gql<{ brandPickupLocations: Pickup[] }>(PICKUPS, {}, { token: cityAdminToken })
        .then((data) => data.brandPickupLocations.find((p) => p.id === primary?.id))
        .should('deep.include', { is_default: true, is_active: true });
    });
  });

  it('PL-03 an address id no address has has no usage, cannot be made primary or disabled, and deletes nothing', () => {
    [
      ['brandPickupLocationUsage', USAGE],
      ['setDefaultBrandPickupLocation', SET_DEFAULT],
      ['setBrandPickupLocationActive', SET_ACTIVE],
    ].forEach(([field, query]) => {
      expectEachRefused(field, query, { id: NO_ID }, [[cityAdminToken, productRefusal(flagOn, PICKUP_NOT_FOUND)]]);
    });
    cy.gqlRaw(DELETE, { id: NO_ID }, { token: cityAdminToken }).then((body) =>
      whenShopOn(flagOn, 'deleteBrandPickupLocation', body, (b) => expectAnswer('deleteBrandPickupLocation', b, false)),
    );
  });

  it('PL-04 a partner reads pickup addresses only of a brand they own', () => {
    expectEachRefused('myBrandPickupLocations', MINE, { id: NO_ID }, [
      [partnerToken, productRefusal(flagOn, { code: 'NOT_FOUND', message: 'Brand not found' })],
      [null, productRefusal(flagOn, SIGNED_OUT)],
    ]);
  });
});
