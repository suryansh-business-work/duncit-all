/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import {
  storeCopy,
  storeMoney,
  storeProduct,
  storeSettings,
  useStoreDesktop,
  visitSite,
} from '../../../../support/ui-websites';

/**
 * The pet store product page (website/ecomm-store/src/pages/product): title,
 * price from the chosen variant (VariantPicker + useVariantSelection), and the
 * delivery check (delivery-check.form.tsx → EcommStoreDeliveryCheck), whose
 * verdict is drawn from the courier's answer: success, not serviceable, or
 * unknown. Expected figures come from EcommStoreProduct as the page received it.
 */

interface Variant {
  id: string;
  price: number;
  in_stock: boolean;
  option_values: { name: string; value: string }[];
}

interface Product {
  id: string;
  title: string;
  price: number;
  has_variants: boolean;
  options: { name: string; values: string[] }[];
  variants: Variant[];
}

/** A pincode the store's rule accepts (six digits, not starting with 0). */
const PINCODE = '110001';

describe('UI Pet store · Product', () => {
  let t: Translator['t'];
  let symbol: string;

  before(() => {
    storeCopy().then((copy) => {
      t = copy;
    });
    storeSettings().then((settings) => {
      symbol = settings.currency_symbol;
    });
  });

  beforeEach(() => {
    useStoreDesktop();
  });

  const openProduct = (slug: string): Cypress.Chainable<Product> => {
    cy.interceptOperation('EcommStoreProduct');
    visitSite('ecomm', `/p/${encodeURIComponent(slug)}`);
    return cy.wait('@EcommStoreProduct').then(({ response }) => {
      const product = response?.body?.data?.storeProduct as Product | null;
      if (!product) throw new Error(`EcommStoreProduct answered no product for ${slug}.`);
      return product;
    });
  };

  it('PROD-01 the page names the product, prices it and counts the view once', () => {
    storeProduct((card) => !card.has_variants, 'without variants').then((card) => {
      cy.interceptOperation('EcommStoreRecordView');
      openProduct(card.slug).then((product) => {
        cy.get('main h1').should('readText', product.title);
        cy.get('main').should('contain.text', storeMoney(product.price, symbol));
        cy.contains('main button', t('ecommStore.product.addToCart')).should('be.enabled');
        cy.wait('@EcommStoreRecordView').its('request.body.variables.product_id').should('eq', product.id);
      });
    });
  });

  it('PROD-02 choosing another variant switches the price to that variant\'s', () => {
    storeProduct((card) => card.has_variants, 'with variants').then((card) => {
      openProduct(card.slug).then((product) => {
        const [option] = product.options;
        const target = product.variants.find((v) => v.in_stock && v.option_values.some((o) => o.name === option.name)) ?? product.variants[0];
        const value = target.option_values.find((o) => o.name === option.name)?.value ?? '';
        // Every other option is set to the target's own values first, so the choice lands on that variant.
        for (const other of product.options.slice(1)) {
          const otherValue = target.option_values.find((o) => o.name === other.name)?.value;
          if (otherValue) cy.get(`main button[value="${otherValue}"]`).first().click();
        }
        cy.get(`main button[value="${value}"]`).first().click().should('have.attr', 'aria-pressed', 'true');
        cy.get('main').should('contain.text', storeMoney(target.price, symbol));
      });
    });
  });

  it('PROD-03 a malformed pincode is refused before any delivery check', () => {
    storeProduct(() => true, '').then((card) => {
      let checks = 0;
      cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
        if ((req.body as { operationName?: string })?.operationName === 'EcommStoreDeliveryCheck') checks += 1;
      });
      openProduct(card.slug);
      cy.get('main input[autocomplete="postal-code"]').clear().type('12');
      cy.contains('main button', t('ecommStore.delivery.check')).click();
      cy.get('main').should('contain.text', t('ecommStore.validation.pincodeInvalid'));
      cy.then(() => expect(checks, 'delivery checks sent').to.eq(0));
    });
  });

  it('PROD-04 a delivery check answers with the courier\'s verdict for that pincode', () => {
    storeProduct(() => true, '').then((card) => {
      openProduct(card.slug);
      cy.interceptOperation('EcommStoreDeliveryCheck');
      cy.get('main input[autocomplete="postal-code"]').clear().type(PINCODE);
      cy.contains('main button', t('ecommStore.delivery.check')).click();
      cy.wait('@EcommStoreDeliveryCheck').then(({ request, response }) => {
        expect(request.body.variables.pincode).to.eq(PINCODE);
        const result = response?.body?.data?.storeDeliveryCheck as { checked: boolean; serviceable: boolean; pincode: string } | null;
        if (!result) {
          cy.get('main [role="alert"] [data-testid="ErrorOutlineIcon"]').should('exist');
          return;
        }
        if (!result.checked) cy.get('main').should('contain.text', t('ecommStore.delivery.unknown'));
        else if (!result.serviceable) cy.get('main').should('contain.text', t('ecommStore.delivery.notServiceable', { vars: { pincode: result.pincode } }));
        else cy.get('main [role="alert"] [data-testid="SuccessOutlinedIcon"]').should('exist');
      });
      cy.window().its('localStorage').invoke('getItem', 'ecomm_pincode').should('contain', PINCODE);
    });
  });
});
