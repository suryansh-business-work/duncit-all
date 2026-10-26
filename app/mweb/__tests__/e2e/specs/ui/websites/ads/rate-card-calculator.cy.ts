/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { expectNewTab, interceptQuery, linkUrl, visitSite, websiteCopy } from '../../../../support/ui-websites';

/**
 * The ads rate table (#placements, Placements.astro, baked at build time) and
 * the campaign calculator (#calculator, @duncit/brand/widgets/campaign-calculator)
 * that re-reads publicAdRateCard in the browser and prices every ticked
 * placement for the chosen days. Every expected figure is computed here from
 * the same live card.
 */

interface RateEntry {
  position: string;
  label: string;
  note: string | null;
  price_per_day: number;
}

interface RateCard {
  currency_symbol: string;
  min_days: number;
  max_days: number;
  entries: RateEntry[];
}

const RATE_CARD = `query E2eAdRateCard { publicAdRateCard { currency_symbol min_days max_days entries { position label note price_per_day } } }`;
const CALC = '[data-cms-widget="campaign-calculator"]';

describe('UI Ads website · Rate card calculator', () => {
  let t: Translator['t'];
  let card: RateCard;

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
    cy.gql<{ publicAdRateCard: RateCard | null }>(RATE_CARD, {}, { token: null }).then((data) => {
      if (!data.publicAdRateCard?.entries.length) throw new Error('Staging prerequisite: the ad rate card has no placements (Marketing > Ad rate card).');
      card = data.publicAdRateCard;
    });
  });

  const money = (value: number): string => `${card.currency_symbol}${Math.round(value).toLocaleString('en-IN')}`;
  const perDay = (): string => t('website.ads.calculator.perDaySuffix');
  const chip = (position: string) => cy.get(`${CALC} input[name="placement"][value="${position}"]`);
  const openCalculator = () => {
    interceptQuery('publicAdRateCard', 'rateCard');
    visitSite('ads');
    cy.wait('@rateCard');
  };
  const setDays = (days: number) => cy.get(`${CALC} input[name="days"]`).invoke('val', days).trigger('input');

  /** The rows and the total the calculator must show for `positions` over `days`. */
  function expectQuote(positions: string[], days: number): void {
    const lines = card.entries.filter((entry) => positions.includes(entry.position));
    cy.get(`${CALC} [data-rows] > div`).should('have.length', lines.length);
    lines.forEach((entry, index) => {
      cy.get(`${CALC} [data-rows] > div`).eq(index).within(() => {
        cy.get('dt').should('readText', `${entry.label} · ${money(entry.price_per_day)}${perDay()}`);
        cy.get('dd').should('readText', money(entry.price_per_day * days));
      });
    });
    cy.get(`${CALC} [data-total]`).should('readText', money(lines.reduce((sum, entry) => sum + entry.price_per_day * days, 0)));
  }

  it('RATE-01 the rate table lists each placement with its note and its per-day price', () => {
    visitSite('ads');
    cy.get('#placements tbody[data-rate-rows] tr').should('have.length', card.entries.length);
    card.entries.forEach((entry, index) => {
      cy.get('#placements tbody[data-rate-rows] tr').eq(index).within(() => {
        cy.get('th').should('readText', entry.label);
        cy.get('td').last().should('readText', money(entry.price_per_day));
      });
    });
  });

  it('RATE-02 the calculator re-reads the live card and starts on HOME_BOTTOM for 7 days (or the max)', () => {
    interceptQuery('publicAdRateCard', 'rateCard');
    visitSite('ads');
    cy.wait('@rateCard').its('response.body.data.publicAdRateCard.entries').should('have.length', card.entries.length);
    const days = Math.min(Math.max(7, card.min_days), card.max_days);
    cy.get(`${CALC} input[name="days"]`).should('have.value', String(days));
    cy.get(`${CALC} [data-days-out]`).should('readText', days === 1 ? '1 day' : `${days} days`);
    const ticked = card.entries.some((entry) => entry.position === 'HOME_BOTTOM') ? ['HOME_BOTTOM'] : [];
    cy.get(`${CALC} input[name="placement"]:checked`).should('have.length', ticked.length);
    if (ticked.length) expectQuote(ticked, days);
  });

  it('RATE-03 ticking another placement adds its row, and dragging the days recomputes every subtotal and the total', () => {
    const other = card.entries.find((entry) => entry.position !== 'HOME_BOTTOM' && entry.position !== 'AUTO');
    if (!other) throw new Error('Staging prerequisite: the rate card has no second placement to tick.');
    openCalculator();
    cy.get(`${CALC} input[name="placement"]`).then(($inputs) => {
      const picked = [...$inputs].filter((input) => (input as HTMLInputElement).checked).map((input) => (input as HTMLInputElement).value);
      chip(other.position).check({ force: true });
      const days = Math.min(Math.max(14, card.min_days), card.max_days);
      setDays(days);
      cy.get(`${CALC} [data-days-out]`).should('readText', days === 1 ? '1 day' : `${days} days`);
      expectQuote([...picked, other.position], days);
      cy.get(`${CALC} [data-note]`).should('readText', t('website.ads.calculator.note'));
    });
  });

  it('RATE-04 ticking AUTO lights every zone of the phone preview', () => {
    if (!card.entries.some((entry) => entry.position === 'AUTO')) throw new Error('Staging prerequisite: the rate card has no AUTO placement.');
    openCalculator();
    chip('AUTO').check({ force: true });
    cy.get(`${CALC} [data-zone]`).should('have.length.at.least', 1).each(($zone) => {
      expect($zone).to.have.class('is-live');
    });
  });

  it('RATE-05 with nothing ticked the total is a dash and the note warns to pick a placement', () => {
    openCalculator();
    cy.get(`${CALC} input[name="placement"]`).should('have.length', card.entries.length);
    cy.get(`${CALC} input[name="placement"]`).uncheck({ force: true });
    cy.get(`${CALC} [data-total]`).should('readText', '—');
    cy.get(`${CALC} [data-rows] > div`).should('have.length', 0);
    cy.get(`${CALC} [data-note]`).should('readText', t('website.ads.calculator.emptyNote')).and('have.class', 'font-semibold');
  });

  it('RATE-06 the days slider is held inside the live min–max window', () => {
    openCalculator();
    cy.get(`${CALC} input[name="days"]`)
      .should('have.attr', 'min', String(card.min_days))
      .and('have.attr', 'max', String(card.max_days));
    cy.get(`${CALC} input[name="days"]`).then(($input) => {
      const value = Number($input.val());
      expect(value).to.be.within(card.min_days, card.max_days);
    });
  });

  it('RATE-07 the calculator CTA opens the Ads console in a new tab', () => {
    visitSite('ads');
    cy.contains(`${CALC} a`, t('website.ads.calculator.cta')).then(($cta) => expectNewTab($cta, linkUrl('adsPortal')));
  });
});
