/// <reference types="cypress" />
import { captchaCopy, type CaptchaCopy, type Translator } from '@duncit/i18n';
import {
  blockQuery,
  captchaToken,
  expectInViewport,
  expectNeverSent,
  guardMutation,
  interceptQuery,
  siteBranding,
  visitSite,
  websiteCopy,
  WRONG_CAPTCHA,
  type SiteBranding,
} from '../../../../support/ui-websites';

/**
 * duncit.com/faq (@duncit/brand/widgets/faq: faq-list + faq-ask) and /help
 * (widgets/help-center), both reading publicFaqGroups live. The ask form never
 * files a question: client checks stop the short one, the browser stops the
 * missing email, and a wrong captcha is refused before anything is stored
 * (faq.resolver.ts requireHuman).
 */

interface FaqGroup {
  super_category: { name: string; slug: string } | null;
  faqs: { question: string; answer: string }[] | null;
}

const FAQ_GROUPS = `query E2eFaqGroups { publicFaqGroups { super_category { name slug } faqs { question answer } } }`;
const LIST = '#faqGroups';
const ASK = 'form#askFaqForm';

describe('UI duncit.com · FAQ and Help Center', () => {
  let t: Translator['t'];
  let captcha: CaptchaCopy;
  let branding: SiteBranding;
  let groups: FaqGroup[];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
      captcha = captchaCopy(copy);
    });
    siteBranding().then((found) => {
      branding = found;
    });
    cy.gql<{ publicFaqGroups: FaqGroup[] }>(FAQ_GROUPS, {}, { token: null }).then((data) => {
      groups = data.publicFaqGroups.filter((group) => (group.faqs?.length ?? 0) > 0);
      if (!groups.length) throw new Error('Staging prerequisite: no FAQ is published (Support > FAQs).');
    });
  });

  it('FAQ-01 each super category is an anchored heading over its questions, the first one open', () => {
    interceptQuery('publicFaqGroups', 'faqs');
    visitSite('main', '/faq');
    cy.wait('@faqs');
    cy.get(`${LIST} section`).should('have.length', groups.length);
    for (const group of groups) {
      if (group.super_category) {
        cy.get(`${LIST} h2[id="${group.super_category.slug}"]`).should('readText', group.super_category.name);
      }
      const [first] = group.faqs ?? [];
      cy.contains(`${LIST} details summary`, first.question).parent('details').should('have.attr', 'open');
    }
  });

  it('FAQ-02 a closed question opens to its answer', () => {
    const group = groups.find((g) => (g.faqs?.length ?? 0) > 1);
    if (!group?.faqs) throw new Error('Staging prerequisite: no FAQ group has a second question to open.');
    const second = group.faqs[1];
    visitSite('main', '/faq');
    cy.contains(`${LIST} details summary`, second.question).parent('details').as('card');
    cy.get('@card').should('not.have.attr', 'open');
    cy.get('@card').find('summary').click();
    cy.get('@card').should('have.attr', 'open');
    cy.get('@card').find('p').should('be.visible').and('contain.text', second.answer.split('\n')[0].trim());
  });

  it('FAQ-03 /faq#<category-slug> scrolls to that group once it loads', () => {
    const group = groups.find((g) => g.super_category) ?? groups[0];
    if (!group.super_category) throw new Error('Staging prerequisite: no FAQ group belongs to a super category.');
    const slug = group.super_category.slug;
    visitSite('main', `/faq#${slug}`);
    cy.get(`${LIST} h2[id="${slug}"]`).should(expectInViewport);
  });

  it('FAQ-04 a question shorter than five characters is refused before any request', () => {
    guardMutation('submitFaqQuestion', 'ask');
    visitSite('main', '/faq');
    cy.get(`${ASK} textarea[name="question"]`).type('Hi?');
    cy.get(`${ASK} input[name="email"]`).type('e2e-faq@example.com');
    captchaToken(ASK);
    cy.get(`${ASK} input[name="captcha_answer"]`).type('ABCDE');
    cy.get(`${ASK} button`).last().click();
    cy.get(`${ASK} [data-form-error]`).should('not.have.class', 'hidden').and('readText', t('website.main.faq.tooShort'));
    expectNeverSent('ask');
  });

  it('FAQ-05 a valid question with no email is stopped on the required email field', () => {
    guardMutation('submitFaqQuestion', 'ask');
    visitSite('main', '/faq');
    cy.get(`${ASK} textarea[name="question"]`).type('Can I join a pod without the app?');
    cy.get(`${ASK} button`).last().click();
    cy.get(`${ASK} input[name="email"]`).should(($input) => {
      expect(($input[0] as HTMLInputElement).validity.valueMissing).to.eq(true);
    });
    expectNeverSent('ask');
  });

  it('FAQ-06 a wrong captcha answer gets the wrong-code message and files nothing', () => {
    visitSite('main', '/faq');
    cy.get(`${ASK} textarea[name="question"]`).type('Can I join a pod without the app?');
    cy.get(`${ASK} input[name="email"]`).type('e2e-faq@example.com');
    captchaToken(ASK);
    cy.get(`${ASK} input[name="captcha_answer"]`).type(WRONG_CAPTCHA);
    interceptQuery('submitFaqQuestion', 'ask');
    cy.get(`${ASK} button`).last().click();
    cy.wait('@ask').then(({ response }) => {
      expect(response?.body?.errors?.[0]?.extensions?.code).to.eq('CAPTCHA_WRONG');
      expect(response?.body?.data?.submitFaqQuestion ?? null).to.eq(null);
    });
    cy.get(`${ASK} [data-captcha-error]`).should('readText', captcha.wrong);
  });

  it('FAQ-07 the support email under the form is a mailto link', () => {
    visitSite('main', '/faq');
    cy.get(`main a[href="mailto:${branding.support_email}"]`).should('readText', branding.support_email);
  });

  it('HELP-01 the Help Center shows a topic card per FAQ group with its question count, linking to that group', () => {
    interceptQuery('publicFaqGroups', 'topics');
    visitSite('main', '/help');
    cy.wait('@topics');
    cy.get('[data-topic-card]').should('have.length', groups.length);
    for (const group of groups) {
      const name = group.super_category?.name ?? t('website.main.help.general');
      const count = group.faqs?.length ?? 0;
      const noun = count === 1 ? t('website.main.help.questionOne') : t('website.main.help.questionMany');
      const href = group.super_category ? `/faq#${encodeURIComponent(group.super_category.slug)}` : '/faq';
      cy.get(`[data-topic-card][data-topic-name="${name.toLowerCase()}"]`)
        .should('have.attr', 'href', href)
        .and('contain.text', name)
        .and('contain.text', `${count} ${noun}`);
    }
  });

  it('HELP-02 typing in the search keeps only the topics whose name contains it', () => {
    const name = (groups[0].super_category?.name ?? t('website.main.help.general')).toLowerCase();
    const term = name.slice(0, Math.min(4, name.length));
    const expected = groups.filter((g) => (g.super_category?.name ?? t('website.main.help.general')).toLowerCase().includes(term));
    visitSite('main', '/help');
    cy.get('[data-topic-card]').should('have.length', groups.length);
    cy.get('input[data-help-search]').type(term);
    cy.get('[data-topic-card]:visible').should('have.length', expected.length);
    cy.get('input[data-help-search]').clear().type('zz-e2e-no-topic');
    cy.get('[data-topic-card]:visible').should('have.length', 0);
  });

  it('HELP-03 a topic card opens /faq at its group', () => {
    const group = groups.find((g) => g.super_category);
    if (!group?.super_category) throw new Error('Staging prerequisite: no FAQ group belongs to a super category.');
    const slug = group.super_category.slug;
    visitSite('main', '/help');
    cy.get(`[data-topic-card][href="/faq#${encodeURIComponent(slug)}"]`).click();
    cy.location('pathname').should('eq', '/faq');
    cy.location('hash').should('eq', `#${encodeURIComponent(slug)}`);
    cy.get(`${LIST} h2[id="${slug}"]`).should(expectInViewport);
  });

  it('HELP-04 Still need help offers email, the contact form and the ask form (and a call when a phone is set)', () => {
    visitSite('main', '/help');
    cy.get(`main a[href="mailto:${branding.support_email}"]`).should('contain.text', t('website.main.help.emailTitle'));
    cy.get('main a[href="/contact"]').should('contain.text', t('website.main.help.formTitle'));
    cy.get('main a[href="/faq"]').should('contain.text', t('website.main.help.askTitle'));
    cy.get('main a[href^="tel:"]').should('have.length', branding.support_phone ? 1 : 0);
  });

  it('HELP-05 an unreachable API leaves the topics area saying so', () => {
    blockQuery('publicFaqGroups');
    visitSite('main', '/help');
    cy.get('[data-cms-widget="help-center"]').should('readText', t('website.main.help.error'));
  });
});
