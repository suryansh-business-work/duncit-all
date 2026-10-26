import { toGenderValue, toPetOwnerValue } from '@duncit/utils';
import { cityAdminSeat, releaseAdminRoles, signInAdmin, type AdminSeat } from '../../support/ui-admin-2';

/**
 * Admin › All Users › a user (/users/:user_id), read as a City Admin, on the
 * run account's own record — the one member whose records this suite knows.
 * The finance tabs narrow every table to that one account (a `user_id` filter
 * on Payment / Refund / Coin logs, the `user_id` argument on Shop Orders); the
 * profile shows the member's own demographic answers read-only.
 */

interface TableQuery {
  filters?: { field: string; op: string; value?: string }[];
}

interface TableAnswer {
  data?: Record<string, { total: number; rows: { id: string }[] }>;
  errors?: { message: string }[];
}

const ADMIN_USER = `query E2eAdminUserDemographics($id: ID!) { user(user_id: $id) { user_id gender is_pet_owner } }`;

/** The table's request is narrowed to the account, and what it answered is what it draws. */
function expectOwnLog(operation: string, field: string, tableId: string, userId: string): void {
  cy.wait(`@${operation}`).then(({ request, response }) => {
    const query = request.body.variables.query as TableQuery;
    expect(query.filters, `${operation} filters by the account`).to.deep.include({
      field: 'user_id',
      op: 'eq',
      value: userId,
    });
    const body = response?.body as TableAnswer;
    expect(body.errors, `${operation} answers a City Admin`).to.be.undefined;
    const page = body.data?.[field];
    cy.byTestId(tableId).within(() => {
      if (!page || page.total === 0) {
        cy.byTestId('duncit-table-empty').should('exist');
        return;
      }
      for (const row of page.rows) cy.byTestId(`${tableId}-row-${row.id}`).should('exist');
    });
  });
}

describe('Admin · User details (City Admin, run account)', () => {
  let seat: AdminSeat;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    releaseAdminRoles(seat?.account);
  });

  it('UDT-01 Payment & Refund Logs and Shop Orders list only this account’s records', () => {
    for (const op of ['AdminUserPaymentsTable', 'AdminUserRefundsTable', 'AdminUserCoinTransactionsTable']) {
      cy.interceptOperation(op);
    }
    cy.visitPortal('admin', `/users/${seat.userId}?selectedtab=payment-refund-logs`);
    expectOwnLog('AdminUserPaymentsTable', 'paymentsTable', 'admin-user-payments', seat.userId);
    expectOwnLog('AdminUserRefundsTable', 'userRefundsTable', 'admin-user-refunds', seat.userId);
    expectOwnLog('AdminUserCoinTransactionsTable', 'coinTransactionsTable', 'admin-user-coins', seat.userId);

    cy.interceptOperation('AdminUserShopOrders');
    cy.visitPortal('admin', `/users/${seat.userId}?selectedtab=shop-orders`);
    cy.wait('@AdminUserShopOrders').then(({ request, response }) => {
      expect(request.body.variables.user_id).to.eq(seat.userId);
      expect((response?.body as TableAnswer).errors, 'shop orders answer a City Admin').to.be.undefined;
    });
    cy.byTestId('admin-user-shop-orders').should('be.visible');
  });

  it('UDT-02 gender and pet owner show the member’s own answers as dropdowns that cannot be changed', () => {
    cy.gql<{ user: { gender: string | null; is_pet_owner: boolean | null } }>(ADMIN_USER, { id: seat.userId }).then(
      ({ user }) => {
        cy.visitPortal('admin', `/users/${seat.userId}?selectedtab=profile`);
        cy.byTestId('admin-user-gender').find('input').first().should('have.value', toGenderValue(user.gender));
        cy.byTestId('admin-user-pet-owner')
          .find('input')
          .first()
          .should('have.value', toPetOwnerValue(user.is_pet_owner));
        for (const id of ['admin-user-gender', 'admin-user-pet-owner']) {
          cy.byTestId(id).find('[role="combobox"]').click();
          cy.get('[role="listbox"]').should('not.exist');
        }
      },
    );
  });
});
