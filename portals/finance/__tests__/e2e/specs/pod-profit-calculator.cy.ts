import { baseMocks } from '../support/fixtures';

/**
 * Pod Profit Calculator journey (converted from the Playwright
 * `e2e/calculator.pw.ts`). Every expected rupee figure below is the output of
 * the finance engine the page mirrors (`useCalculator` -> server
 * `breakdown.math.ts`), so a drift in either side fails this suite.
 */

/** Percent sliders/inputs are labelled via `aria-label` (no `<label>` element). */
const PERCENT_LABELS = [
  'GST',
  'Platform fee — Duncit income',
  'Venue commission — Duncit income',
  'Host commission — Duncit income',
  'Club admin cut — Duncit income',
] as const;

/** A `TextField` located by its floating MUI label. */
const numberField = (label: string) =>
  cy.contains('label', label).closest('.MuiFormControl-root').find('input[type="number"]');

const percentInput = (label: string) => cy.get(`input[type="number"][aria-label="${label}"]`);

const percentSlider = (label: string) =>
  cy.get(`input[type="range"][aria-label="${label}"]`).closest('.MuiSlider-root');

/** The value (`subtitle1` -> `<h6>`) of a results Row, located by its label. */
const rowValue = (label: string) =>
  cy.contains('p', label).closest('.MuiStack-root').find('h6');

const duncitRevenue = () => cy.contains('Total Duncit revenue').siblings('h4');

const DEFAULT_DUNCIT_REVENUE = '₹3,563.56';

/**
 * Replace a numeric field's contents in a single edit — the Cypress equivalent
 * of the Playwright original's `locator.fill()`.
 *
 * `.clear().type(next)` is NOT equivalent on this page: every input is a
 * controlled `<TextField type="number">` whose `onChange` coerces through
 * `Number(e.target.value)`, so clearing re-renders the field as "0" and the
 * digits that follow land *around* that zero (30 -> clear -> "0" -> "10" ->
 * "100"). Selecting the existing text and overtyping keeps the DOM value and the
 * React state byte-identical after every keystroke, so the caret never jumps.
 * The trailing assertion makes a future regression fail here instead of silently
 * feeding a different number into the waterfall expectations below.
 */
const setNumber = (label: string, next: string) => {
  numberField(label).type(`{selectall}${next}`);
  return numberField(label).should('have.value', next);
};

describe('Pod profit calculator', () => {
  beforeEach(() => {
    cy.mockGraphql(baseMocks());
    cy.visitAuthed('/calculators/pod-profit');
    cy.contains('Pod Profit Calculator').should('be.visible');
  });

  it('renders the full waterfall for the default pod', () => {
    cy.contains('Total Duncit revenue').should('be.visible');
    cy.contains('p', 'Total collection').should('be.visible');
    // The results card is `position: sticky`, and Cypress hit-tests a sticky
    // element's centre against the viewport before calling it visible. At
    // 1280x800 the card's last row starts below the fold, so it has to be
    // scrolled to first — Playwright's `toBeVisible()` (the original assertion)
    // only checked CSS/box geometry and never the viewport.
    cy.contains('p', 'Reconciles to collection').scrollIntoView().should('be.visible');

    // ₹1000 × 30 spots, but the host's spot is free -> 29 payable spots.
    rowValue('Payable spots').should('have.text', '29 of 30');
    rowValue('Total collection').should('have.text', '₹29,000.00');
    duncitRevenue().should('have.text', DEFAULT_DUNCIT_REVENUE);
    rowValue('Reconciles to collection').should('have.text', '₹29,000.00');
  });

  it('recalculates the whole waterfall when the pod pricing inputs change', () => {
    setNumber('Ticket price per spot (GST-inclusive)', '1500');
    setNumber('No. of spots', '10');
    setNumber('Venue fixed cost', '500');

    // ₹1500 × 9 payable spots = ₹13,500 collection, GST 18%, fee 5%,
    // venue ₹500 (−10%), host keeps the rest (−10%).
    rowValue('Payable spots').should('have.text', '9 of 10');
    rowValue('Total collection').should('have.text', '₹13,500.00');
    rowValue('GST (to government)').should('have.text', '₹2,059.32');
    rowValue('Remaining pool').should('have.text', '₹10,868.65');
    rowValue('Venue receives').should('have.text', '₹450.00');
    rowValue('Host receives').should('have.text', '₹9,331.78');
    duncitRevenue().should('have.text', '₹1,658.90');
    // The engine's core invariant: every rupee is accounted for.
    rowValue('Reconciles to collection').should('have.text', '₹13,500.00');
  });

  it('keeps every percent slider in sync with its number input and the results', () => {
    PERCENT_LABELS.forEach((label) => {
      percentSlider(label).click('center');
      percentSlider(label)
        .find('.MuiSlider-valueLabel')
        .should('contain.text', '%');
      // The slider and its paired number field are one controlled value.
      cy.get(`input[type="range"][aria-label="${label}"]`).then(($range) => {
        percentInput(label).should('have.value', $range.attr('aria-valuenow'));
      });
    });

    // Moving the percentages must move Duncit's cut off its default.
    duncitRevenue().should('not.have.text', DEFAULT_DUNCIT_REVENUE);
    // ...without ever breaking the reconciliation invariant.
    rowValue('Reconciles to collection').should('have.text', '₹29,000.00');
  });

  it('clamps a percent typed above its maximum', () => {
    // GST is capped at 28%.
    percentInput('GST').type('{selectall}40').should('have.value', '28');
  });

  it('clamps a venue price above the pool and zeroes the host', () => {
    setNumber('Venue fixed cost', '1000000');

    // Venue takes the whole ₹23,347.46 pool (−10% commission), host gets nothing.
    rowValue('Venue receives').should('have.text', '₹21,012.71');
    rowValue('Host receives').should('have.text', '₹0.00');
    rowValue('Reconciles to collection').should('have.text', '₹29,000.00');
  });

  it('handles a zero spot count without dividing by zero', () => {
    setNumber('No. of spots', '0');

    rowValue('Payable spots').should('have.text', '0 of 0');
    rowValue('Total collection').should('have.text', '₹0.00');
    cy.contains('0.0% host take-home').should('be.visible');
  });

  it('resets the inputs back to the defaults', () => {
    setNumber('Ticket price per spot (GST-inclusive)', '1500');
    setNumber('No. of spots', '10');

    cy.contains('button', 'Reset').click();

    numberField('Ticket price per spot (GST-inclusive)').should('have.value', '1000');
    numberField('No. of spots').should('have.value', '30');
    duncitRevenue().should('have.text', DEFAULT_DUNCIT_REVENUE);
  });
});
