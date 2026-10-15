/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { storeCopy, storeSettings, useStoreDesktop, visitSite } from '../../../../support/ui-websites';

/**
 * Guest order tracking (src/pages/track): a link carrying an order number and
 * its access key opens that order through EcommStoreOrder; a wrong key is
 * refused by the server and the page shows an error — never an order.
 */
describe('UI Pet store · Track an order', () => {
  let t: Translator['t'];

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings();
  });

  it('TRACK-01 /track opens with its title and the lookup form', () => {
    useStoreDesktop();
    visitSite('ecomm', '/track');
    cy.get('main h1').should('readText', t('ecommStore.track.title'));
    cy.get('main').should('contain.text', t('ecommStore.track.intro'));
    cy.get('main form').should('exist');
  });

  it('TRACK-02 an order link with a wrong key is refused and shows no order data', () => {
    useStoreDesktop();
    cy.interceptOperation('EcommStoreOrder');
    visitSite('ecomm', '/track?order=E2E-NO-SUCH-ORDER&key=e2e-wrong-key');
    cy.wait('@EcommStoreOrder').then(({ request, response }) => {
      expect(request.body.variables).to.deep.include({ order_no: 'E2E-NO-SUCH-ORDER', access_key: 'e2e-wrong-key' });
      expect(response?.body?.data?.storeOrder ?? null, 'no order leaks').to.eq(null);
      expect(response?.body?.errors ?? [], 'refused').to.have.length.greaterThan(0);
    });
    cy.get('main [role="alert"]').should('be.visible');
    cy.get('main form').should('not.exist');
  });
});
