/// <reference types="cypress" />
import {
  ACCESS_DENIED,
  revokeRunRoles,
  signInRunAs,
  signInRunMember,
  SIGNED_OUT,
} from '../../../support/access-steps';
import { expectEachRefused, productFlagOn, productRefusal, whenShopOn } from '../../../support/api-partners';

/**
 * The Pod Shop's settings in the Products console: Cart Settings
 * (/cart/settings — productCartSettings is a public read behind the product
 * flag, updateProductCartSettings is SUPER_ADMIN, PRODUCTS_MANAGER,
 * TECH_MANAGER: commerce/productCart/productCart.resolver.ts) and the Pod Shop
 * Slider (/settings/pod-shop-slider — Branding.pod_shop_slider, saved by
 * updatePodShopSlider = SUPER_ADMIN, CITY_ADMIN, PRODUCTS_MANAGER,
 * TECH_MANAGER: platform/settings/settings.resolver.ts). No cart setting is
 * changed (no grantable role may). The slider is saved once by a city admin
 * with exactly the slides it already has — the save path runs end to end and
 * the live slider is left as it was. Scenario map: Products › Cart Settings
 * (public read, denied roles), Pod Shop Slider (save, reload, denied roles).
 */

const CART_FIELDS = 'nudge_enabled nudge_delay_minutes nudge_auto_hide_seconds email_enabled email_first_delay_hours email_repeat_hours email_max_count';
const CART = `query E2eCsRead { productCartSettings { ${CART_FIELDS} } }`;
const CART_SAVE = `mutation E2eCsSave { updateProductCartSettings(input: { nudge_delay_minutes: 30 }) { ${CART_FIELDS} } }`;

const SLIDE_FIELDS = 'url type order heading subheading cta_label cta_url';
const SLIDER = `query E2eSlRead { branding { pod_shop_slider { ${SLIDE_FIELDS} } } }`;
const SLIDER_SAVE = `mutation E2eSlSave($input: [PodShopSliderMediaInput!]!) { updatePodShopSlider(input: $input) { ${SLIDE_FIELDS} } }`;

interface CartSettings {
  nudge_enabled: boolean;
  nudge_delay_minutes: number;
  nudge_auto_hide_seconds: number;
  email_enabled: boolean;
  email_first_delay_hours: number;
  email_repeat_hours: number;
  email_max_count: number;
}
interface Slide {
  url: string;
  type: string;
  order: number;
  heading: string;
  subheading: string;
  cta_label: string;
  cta_url: string;
}

const readSlider = () => cy.gql<{ branding: { pod_shop_slider: Slide[] } }>(SLIDER, {}, { token: null }).then((d) => d.branding.pod_shop_slider);

describe('API · Pod Shop settings: cart reminders and the shop slider', { testIsolation: false }, () => {
  let memberToken = '';
  let cityAdminToken = '';
  let partnerToken = '';
  let flagOn = false;
  let cart: CartSettings | null = null;

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

  it('CS-01 the cart reminder settings are a public read, each inside the range the form enforces', () => {
    cy.gqlRaw(CART, {}, { token: null }).then((body) =>
      whenShopOn(flagOn, 'productCartSettings', body, (b) => {
        expect(b.errors).to.be.undefined;
        const s = b.data?.productCartSettings as CartSettings;
        expect(s.nudge_enabled).to.be.a('boolean');
        expect(s.email_enabled).to.be.a('boolean');
        expect(s.nudge_delay_minutes, 'Show after (minutes)').to.be.within(1, 1440);
        expect(s.nudge_auto_hide_seconds, 'Hide after (seconds)').to.be.within(3, 60);
        expect(s.email_first_delay_hours).to.be.within(1, 720);
        expect(s.email_repeat_hours).to.be.within(1, 720);
        expect(s.email_max_count).to.be.within(1, 20);
        cart = s;
      }),
    );
  });

  it('CS-02 saving cart settings is refused to everyone outside Products and Tech, and nothing changes', () => {
    expectEachRefused('updateProductCartSettings', CART_SAVE, {}, [
      [null, productRefusal(flagOn, SIGNED_OUT)],
      [memberToken, productRefusal(flagOn, ACCESS_DENIED)],
      [partnerToken, productRefusal(flagOn, ACCESS_DENIED)],
      [cityAdminToken, productRefusal(flagOn, ACCESS_DENIED)],
    ]);
    if (!flagOn) return;
    expect(cart, 'CS-01 read the settings first').not.to.be.null;
    cy.gql<{ productCartSettings: CartSettings }>(CART, {}, { token: null }).its('productCartSettings').should('deep.equal', cart);
  });

  it('SL-01 the slider is public on Branding, every slide an image or a video with a link', () => {
    readSlider().then((slides) => {
      slides.forEach((slide) => {
        expect(['IMAGE', 'VIDEO'], 'slide type').to.include(slide.type);
        expect(slide.url, 'slide media').to.be.a('string').and.not.be.empty;
        expect(Number.isInteger(slide.order), 'slide order').to.equal(true);
      });
    });
  });

  it('SL-02 a member, a brand partner and a signed-out caller cannot save (here: empty) the slider', () => {
    readSlider().then((slides) => {
      expectEachRefused('updatePodShopSlider', SLIDER_SAVE, { input: [] }, [
        [null, SIGNED_OUT],
        [memberToken, ACCESS_DENIED],
        [partnerToken, ACCESS_DENIED],
      ]);
      readSlider().should('deep.equal', slides);
    });
  });

  it('SL-03 a city admin’s save keeps the slides in order with their text, and a reload reads the same slider', () => {
    readSlider().then((slides) => {
      const input = slides.map(({ url, type, order, heading, subheading, cta_label, cta_url }) => ({
        url,
        type,
        order,
        heading,
        subheading,
        cta_label,
        cta_url,
      }));
      cy.gql<{ updatePodShopSlider: Slide[] }>(SLIDER_SAVE, { input }, { token: cityAdminToken })
        .its('updatePodShopSlider')
        .should('deep.equal', slides);
      readSlider().should('deep.equal', slides);
    });
  });
});
