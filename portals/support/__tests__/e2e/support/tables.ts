import type { StaffPortal } from './portals';

/**
 * A @duncit/table page, driven the way a person drives it: open the page, type
 * into its search box, click the row. DuncitTable names its search box
 * `table-toolbar-search` and every row `<tableId>-row-<rowId>`, so the spec
 * reaches the one record it looked up by id and never AG Grid's own markup.
 */

/** Open a table page and wait for its first page of rows. */
export function openTable(portal: StaffPortal, path: string, operation: string): void {
  cy.interceptOperation(operation);
  cy.visitPortal(portal, path);
  cy.wait(`@${operation}`);
}

/**
 * Type into the search box and wait for the query that answers it. Typed at
 * once: the box is disabled while a fetch is in flight, so a keystroke landing
 * after the debounce fired would be lost.
 */
export function searchTable(operation: string, text: string): void {
  cy.byTestId('table-toolbar-search').should('be.enabled').type(text, { delay: 0 });
  cy.wait(`@${operation}`);
}

/** The row, once it shows every text given. */
export function tableRow(tableId: string, rowId: string, texts: readonly string[]): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.byTestId(`${tableId}-row-${rowId}`).should(($row) => {
    for (const text of texts) {
      expect($row).to.contain.text(text);
    }
  });
}

/** Click the row inside its first column, which holds text rather than a control. */
export function openRow(tableId: string, rowId: string, texts: readonly string[]): void {
  tableRow(tableId, rowId, texts).click(24, 16);
}
