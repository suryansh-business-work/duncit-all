/// <reference types="cypress" />
import { openFromMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import { NO_SUCH_ID, declineTracking, requireProductsOn, visitAndWait } from '../../../support/ui-apps-3';

/**
 * Product orders, live (scenario map › Product orders).
 *
 * My Product Order History (/orders) lists `myProductOrders`; the run account
 * has bought nothing, so it shows the empty state. An order page
 * (/orders/:orderId) answers only for the buyer's own order — any other id
 * comes back null from `myProductOrder` and the page says it could not find it.
 */
const MY_ORDERS = `query E2eUi3MyOrders { myProductOrders { id } }`;

describe('Product orders', () => {
  const account = runAccount();

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    requireProductsOn();
    cy.gql<{ myProductOrders: Array<{ id: string }> }>(MY_ORDERS).then(({ myProductOrders }) => {
      expect(myProductOrders, 'the run account has placed no product order').to.have.length(0);
    });
  });

  beforeEach(() => {
    declineTracking();
  });

  it('PO-01 menu › My Product Order History, with no orders, says "No product orders yet"', () => {
    cy.interceptOperation('MyProductOrders');
    openFromMenu('sidebar-item-My Product Order History', '/orders');
    cy.wait('@MyProductOrders');
    cy.byTestId('orders-history-header-title').should('have.text', 'My Product Orders');
    cy.byTestId('orders-empty-title').should('have.text', 'No product orders yet');
    cy.byTestIdPrefix('orders-history-order-').should('not.exist');
  });

  it('PO-02 an order id that is not the member’s own shows "We could not find this order" and leads back', () => {
    visitAndWait(`/orders/${NO_SUCH_ID}`, 'MyProductOrder');
    cy.byTestId('order-detail-not-found').should('contain.text', 'It may belong to another account, or the link may be out of date.');
    cy.byTestId('order-detail-empty-title').should('have.text', 'We could not find this order');
    cy.byTestId('order-summary').should('not.exist');
    cy.byTestId('order-detail-empty-action').should('have.text', 'Back to my orders').click();
    cy.location('pathname').should('eq', '/orders');
    cy.byTestId('orders-history-screen').should('be.visible');
  });
});
