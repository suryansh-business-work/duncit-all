/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { blockQuery, expectNeverSent, interceptQuery, visitSite, websiteCopy } from '../../../../support/ui-websites';

/**
 * The earnwith earnings calculator (#calculator, EarningsCalculator.astro +
 * @duncit/brand/widgets/earnings-calculator): every figure is the server's own
 * settlement waterfall (publicPodEarningsEstimate), so each expected row here
 * is computed from the waterfall the page itself received.
 */

type Waterfall = Record<string, number>;

const CALC = '[data-cms-widget="earnings-calculator"]';
const ROW_FIELD: Record<string, string> = {
  gross: 'amount',
  gst: 'gst_amount',
  platform: 'platform_fee_amount',
  venue: 'venue_amount',
  clubAdmin: 'club_admin_amount',
  hostCommission: 'host_commission_amount',
};
const HOST_ROWS = ['gross', 'gst', 'platform', 'venue', 'clubAdmin', 'hostCommission', 'perPod', 'pods'];
const CLUB_ROWS = ['gross', 'gst', 'platform', 'perPod', 'pods'];
const ROW_KEY: Record<string, string> = {
  gross: 'rowGross',
  gst: 'rowGst',
  platform: 'rowPlatform',
  venue: 'rowVenue',
  clubAdmin: 'rowClubAdmin',
  hostCommission: 'rowHostCommission',
  perPod: 'rowPerPod',
  pods: 'rowPods',
};

/** earnings-calculator-view.ts money: paise precision, en-IN grouping. */
const money = (value: number): string =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

describe('UI Earn With website · Earnings calculator', () => {
  let t: Translator['t'];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
  });

  const setSlider = (name: string, value: number) => cy.get(`${CALC} input[name="${name}"]`).invoke('val', value).trigger('input');

  function rowText(key: string, w: Waterfall, pods: number, field: string): string {
    if (key === 'perPod') return money(w[field]);
    if (key === 'pods') return `× ${pods}`;
    const value = w[ROW_FIELD[key]] * pods;
    return key !== 'gross' && value > 0 ? `− ${money(value)}` : money(value);
  }

  function expectRows(rows: string[], w: Waterfall, pods: number, field: string): void {
    cy.get(`${CALC} [data-earn-rows] > div`).should('have.length', rows.length);
    rows.forEach((key, index) => {
      cy.get(`${CALC} [data-earn-rows] > div`).eq(index).within(() => {
        cy.get('dt').should('readText', t(`website.earn.calculator.${ROW_KEY[key]}`));
        cy.get('dd').should('readText', rowText(key, w, pods, field));
      });
    });
  }

  /** Open the page and yield the waterfall of its first estimate. */
  const openCalculator = (): Cypress.Chainable<Waterfall> => {
    interceptQuery('publicPodEarningsEstimate', 'estimate');
    visitSite('earnwith');
    return cy.wait('@estimate').then(({ request, response }) => {
      expect(request.body.variables).to.deep.eq({ amount: 499, spots: 12, venue: 500 });
      const w = response?.body?.data?.publicPodEarningsEstimate?.waterfall as Waterfall | undefined;
      if (!w) throw new Error(`publicPodEarningsEstimate answered no waterfall: ${JSON.stringify(response?.body?.errors ?? null)}`);
      return w;
    });
  };

  it('CALC-01 the Host tab starts selected at ₹499, 12 spots, ₹500 venue and 8 pods, with the monthly take-home', () => {
    openCalculator().then((w) => {
      cy.get(`${CALC} [data-role-tab="host"]`).should('have.attr', 'aria-selected', 'true');
      cy.get(`${CALC} [data-out="ticket"]`).should('readText', '₹499');
      cy.get(`${CALC} [data-out="spots"]`).should('readText', '12');
      cy.get(`${CALC} [data-out="venue"]`).should('readText', '₹500');
      cy.get(`${CALC} [data-out="pods"]`).should('readText', '8');
      cy.get(`${CALC} [data-earn-label]`).should('readText', t('website.earn.calculator.hostTakeHome'));
      cy.get(`${CALC} [data-earn-takehome]`).should('readText', money(w.host_receives * 8));
      expectRows(HOST_ROWS, w, 8, 'host_receives');
    });
  });

  it('CALC-02 the Host duties panel shows its title and four duties', () => {
    openCalculator();
    cy.get(`${CALC} [data-duties-title]`).should('readText', t('website.earn.calculator.hostDutiesTitle'));
    cy.get(`${CALC} [data-duties] li`).should('have.length', 4);
    for (let duty = 1; duty <= 4; duty += 1) cy.get(`${CALC} [data-duties]`).should('contain.text', t(`website.earn.calculator.hostDuty${duty}`));
  });

  it('CALC-03 moving the ticket price asks the server once more and repaints from its answer', () => {
    openCalculator().then(() => {
      interceptQuery('publicPodEarningsEstimate', 'repriced');
      setSlider('ticket', 999);
      cy.get(`${CALC} [data-out="ticket"]`).should('readText', '₹999');
      cy.wait('@repriced').then(({ request, response }) => {
        expect(request.body.variables).to.deep.eq({ amount: 999, spots: 12, venue: 500 });
        const w = response?.body?.data?.publicPodEarningsEstimate?.waterfall as Waterfall;
        cy.get(`${CALC} [data-earn-takehome]`).should('readText', money(w.host_receives * 8));
        expectRows(HOST_ROWS, w, 8, 'host_receives');
      });
    });
  });

  it('CALC-04 moving the pods slider recomputes the month without a new request', () => {
    openCalculator().then((w) => {
      interceptQuery('publicPodEarningsEstimate', 'again');
      setSlider('pods', 20);
      cy.get(`${CALC} [data-out="pods"]`).should('readText', '20');
      cy.get(`${CALC} [data-earn-takehome]`).should('readText', money(w.host_receives * 20));
      expectRows(HOST_ROWS, w, 20, 'host_receives');
      expectNeverSent('again');
    });
  });

  it('CALC-05 the Club admin tab repaints the same figures for the club admin, without a new request', () => {
    openCalculator().then((w) => {
      interceptQuery('publicPodEarningsEstimate', 'again');
      cy.get(`${CALC} [data-role-tab="club_admin"]`).click().should('have.attr', 'aria-selected', 'true');
      cy.get(`${CALC} [data-role-tab="host"]`).should('have.attr', 'aria-selected', 'false');
      cy.get(`${CALC} [data-earn-label]`).should('readText', t('website.earn.calculator.clubAdminTakeHome'));
      cy.get(`${CALC} [data-duties-title]`).should('readText', t('website.earn.calculator.clubAdminDutiesTitle'));
      cy.get(`${CALC} [data-duties] li`).should('have.length', 3);
      expectRows(CLUB_ROWS, w, 8, 'club_admin_amount');
      if (w.club_admin_pct) {
        cy.get(`${CALC} [data-earn-takehome]`).should('readText', money(w.club_admin_amount * 8));
      } else {
        cy.get(`${CALC} [data-earn-takehome]`).should('readText', '—');
        cy.get(`${CALC} [data-earn-note]`).should('readText', t('website.earn.calculator.noShareNote'));
      }
      expectNeverSent('again');
    });
  });

  it('CALC-06 a pod that cannot cover its costs turns the take-home red and says what to change', () => {
    openCalculator().then(() => {
      cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
        const body = req.body as { query?: string; variables?: { venue?: number; spots?: number; amount?: number } };
        const v = body.variables;
        if (body.query?.includes('publicPodEarningsEstimate') && v?.venue === 30000 && v.spots === 2 && v.amount === 99) req.alias = 'short';
      });
      setSlider('ticket', 99);
      setSlider('spots', 2);
      setSlider('venue', 30000);
      cy.get(`${CALC} [data-out="venue"]`).should('readText', '₹30,000');
      cy.wait('@short').then(({ response }) => {
        const w = response?.body?.data?.publicPodEarningsEstimate?.waterfall as Waterfall;
        expect(w.host_receives, 'host is short').to.be.at.most(0);
      });
      cy.get(`${CALC} [data-earn-takehome]`).should('have.class', 'text-primary-dark');
      cy.get(`${CALC} [data-earn-note]`).should('readText', t('website.earn.calculator.shortfallNote'));
    });
  });

  it('CALC-07 an unreachable API leaves a dash and says the estimate could not be loaded', () => {
    blockQuery('publicPodEarningsEstimate');
    visitSite('earnwith');
    cy.get(`${CALC} [data-earn-takehome]`).should('readText', '—');
    cy.get(`${CALC} [data-earn-note]`).invoke('text').should('contain', 'The estimate could not be loaded right now.');
  });

  it('CALC-08 Download PDF saves duncit-earnings-estimate.pdf, a real PDF', () => {
    const file = `${Cypress.config('downloadsFolder')}/duncit-earnings-estimate.pdf`;
    openCalculator();
    cy.get(`${CALC} [data-earn-takehome]`).should('not.have.text', '—');
    cy.contains(`${CALC} [data-print-estimate]`, t('website.earn.calculator.pdfButton')).click();
    cy.readFile(file, 'binary', { timeout: 30000 }).should((content: string) => {
      expect(content.slice(0, 5), 'PDF magic').to.eq('%PDF-');
    });
    cy.get(`${CALC} [data-print-estimate]`).should('not.be.disabled').and('contain.text', t('website.earn.calculator.pdfButton'));
  });

  it('CALC-09 when jsPDF cannot load, the note says the PDF could not be prepared and the button resets', () => {
    cy.intercept('https://cdnjs.cloudflare.com/ajax/libs/jspdf/**', { forceNetworkError: true });
    // CALC-08 has just fetched jsPDF, and cdnjs lets the browser keep it: a
    // script served from the browser cache never reaches the intercept above.
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache' }), { log: false });
    openCalculator();
    cy.get(`${CALC} [data-earn-takehome]`).should('not.have.text', '—');
    cy.get(`${CALC} [data-print-estimate]`).click();
    cy.get(`${CALC} [data-earn-note]`).should('readText', t('website.earn.calculator.pdfError'));
    cy.get(`${CALC} [data-print-estimate]`).should('not.be.disabled').and('contain.text', t('website.earn.calculator.pdfButton'));
  });
});
