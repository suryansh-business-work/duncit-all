import { followedAuthorFixtures, homeFixtures, story } from '../support/data';

/** TEMPORARY diagnostic — dumps what the story rail rendered and which
 * GraphQL operations the app issued, as the failure message, so the CI log
 * shows it. Deleted once the followed-tile failure is understood. */
describe('debug · story rail', () => {
  it('dumps the rail and the operations seen', () => {
    cy.mockGraphql({ ...homeFixtures({ stories: [story] }), ...followedAuthorFixtures() });
    cy.visitApp('/');
    cy.byTestId('status-mine').should('be.visible');
    cy.wait(6000);
    cy.get('@graphql.all').then((calls) => {
      const list = calls as unknown as Array<{
        request: { body: { operationName?: string } | Array<{ operationName?: string }> };
        response?: { statusCode?: number; body?: unknown };
      }>;
      const ops = list.map((c) => {
        const body = c.request.body;
        const names = Array.isArray(body) ? body.map((b) => b.operationName).join('+') : body?.operationName;
        return `${names}:${c.response?.statusCode ?? '-'}:${JSON.stringify(c.response?.body ?? '').slice(0, 80)}`;
      });
      cy.byTestId('status-mine').then(($mine) => {
        const rail = $mine[0].closest('[data-testid], div')?.parentElement?.parentElement;
        const html = (rail?.outerHTML ?? '').replace(/\s+/g, ' ').slice(0, 2500);
        const tiles = [...$mine[0].ownerDocument.querySelectorAll('[data-testid^="status-"]')]
          .map((el) => el.getAttribute('data-testid'))
          .join(',');
        throw new Error(`DEBUG tiles=[${tiles}] ops=[${ops.join(' | ')}] rail=${html}`);
      });
    });
  });
});
