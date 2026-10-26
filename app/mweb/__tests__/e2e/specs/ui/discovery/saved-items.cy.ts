/// <reference types="cypress" />
import { runMarker } from '@duncit/utils';
import { openFromMenu } from '../../../support/menu-steps';
import { runAccount } from '../../../support/run-account';
import {
  declineTracking,
  isUpcomingLinkable,
  listedPods,
  podPath,
  visitAndWait,
  type ListedPod,
} from '../../../support/ui-apps-3';

/**
 * Saved Items, live (scenario map › Saved items).
 *
 * /saved lists the run account's bookmarked pods through `mySavedPods`, with
 * server-side search, a Super → Category → Sub filter (the deepest pick is
 * sent) and seven sorts. The bookmarks are the run account's own: the spec
 * clears them first, saves two listed pods through `toggleSavedPod` (the same
 * mutation the pod card's bookmark sends), and unsaves them at the end. Every
 * expected order and filter result is read from the server with the same
 * arguments the page sends, so the page is held to what the server decided.
 */

const SAVED = `query E2eUi3Saved($search: String, $categoryId: ID, $sort: SavedPodSort) {
  mySavedPods(search: $search, category_id: $categoryId, sort: $sort) { id }
}`;
const TOGGLE = `mutation E2eUi3ToggleSaved($id: ID!) {
  toggleSavedPod(pod_doc_id: $id) { pod_id saved }
}`;
const CLUB_SUPER = `query E2eUi3ClubSuper($id: ID!) { club(club_doc_id: $id) { id super_category_id } }`;
const SUPERS = `query E2eUi3Supers { categories { id level } }`;

const EMPTY_TEXT = 'No saved pods yet. Tap the bookmark on a pod to save it.';

const savedIds = (variables: Record<string, unknown> = {}) =>
  cy.gql<{ mySavedPods: Array<{ id: string }> }>(SAVED, variables).then((data) => data.mySavedPods.map((pod) => pod.id));

/** Bookmark (or un-bookmark) a pod as the run account, and check the answer. */
const setSaved = (podId: string, saved: boolean) =>
  cy.gql<{ toggleSavedPod: { saved: boolean } }>(TOGGLE, { id: podId }).then((data) => {
    expect(data.toggleSavedPod.saved, `pod ${podId} saved`).to.equal(saved);
  });

/** The saved cards, in page order, as pod ids. */
const idsOf = ($actions: JQuery<HTMLElement>): string[] =>
  Cypress.$.makeArray($actions).map((el) =>
    String(el.dataset.testid).replace(/^saved-item-card-/, '').replace(/-action$/, ''),
  );

/** Retried until the list shows exactly `ids`, in that order — or the empty state when there are none. */
const expectShown = (ids: readonly string[]) => {
  if (ids.length === 0) {
    cy.byTestId('saved-items-body-empty-title').should('have.text', EMPTY_TEXT);
    return;
  }
  cy.byTestIdPrefix('saved-item-card-', '-action').should(($actions) => {
    expect(idsOf($actions), 'saved pods on the page, in order').to.deep.equal([...ids]);
  });
};

/** Two titles neither of which finds the other in a search over title and description. */
function distinctPair(pods: readonly ListedPod[]): [ListedPod, ListedPod] | null {
  const text = (pod: ListedPod) => `${pod.pod_title} ${pod.pod_description ?? ''}`.toLowerCase();
  for (const a of pods) {
    for (const b of pods) {
      const apart =
        a.id !== b.id &&
        a.pod_title.localeCompare(b.pod_title) !== 0 &&
        !text(b).includes(a.pod_title.toLowerCase()) &&
        !text(a).includes(b.pod_title.toLowerCase());
      if (apart) return [a, b];
    }
  }
  return null;
}

describe('Saved items', { testIsolation: false }, () => {
  const account = runAccount();
  const noMatch = `${runMarker(account.stamp, 'mweb')} no saved pod says this`;
  let first: ListedPod;
  let second: ListedPod;
  let firstSuperId = '';
  let otherSuperId = '';

  before(() => {
    cy.useRunTraffic();
    cy.apiLogin(account.email, account.password('CHANGED'));
    declineTracking();
    // Start from no bookmarks: any left on the account are its own.
    savedIds().then((ids) => ids.forEach((id) => setSaved(id, false)));
    listedPods().then((pods) => {
      const pair = distinctPair(pods.filter((pod) => isUpcomingLinkable(pod, 0) && !!pod.club_id));
      if (!pair) throw new Error('Staging prerequisite: two listed pods with different titles, each with a club link.');
      [first, second] = pair;
      cy.gql<{ club: { super_category_id: string | null } | null }>(CLUB_SUPER, { id: first.club_id }).then(({ club }) => {
        if (!club?.super_category_id) throw new Error(`The club of pod ${first.id} has no super category.`);
        firstSuperId = club.super_category_id;
      });
    });
    cy.gql<{ categories: Array<{ id: string; level: string }> }>(SUPERS).then(({ categories }) => {
      otherSuperId = categories.find((row) => row.level === 'SUPER' && row.id !== firstSuperId)?.id ?? '';
    });
  });

  after(() => {
    savedIds().then((ids) => ids.forEach((id) => setSaved(id, false)));
  });

  it('SV-01 menu › Saved Items, with nothing saved, shows the empty state', () => {
    cy.interceptOperation('SavedItems');
    openFromMenu('sidebar-item-Saved Items', '/saved');
    cy.wait('@SavedItems');
    cy.byTestId('saved-header-title').should('have.text', 'Saved Items');
    cy.byTestId('saved-items-toolbar-search').should('be.visible');
    cy.byTestId('saved-items-body-empty-title').should('have.text', EMPTY_TEXT);
  });

  it('SV-02 two bookmarked pods are listed, the most recently saved first', () => {
    setSaved(first.id, true);
    setSaved(second.id, true);
    visitAndWait('/saved', 'SavedItems');
    expectShown([second.id, first.id]);
    cy.byTestId(`saved-item-card-${first.id}`).should('contain.text', first.pod_title);
    cy.byTestId(`saved-item-card-${second.id}`).should('contain.text', second.pod_title);
  });

  it('SV-03 search keeps only the pod whose title matches, and nothing matches a phrase no pod has', () => {
    visitAndWait('/saved', 'SavedItems');
    cy.byTestId('saved-items-toolbar-search-input').type(first.pod_title, { delay: 0 });
    expectShown([first.id]);
    cy.byTestId('saved-items-toolbar-search-input').clear();
    cy.byTestId('saved-items-toolbar-search-input').type(noMatch, { delay: 0 });
    expectShown([]);
    cy.byTestId('saved-items-toolbar-search-input').clear();
    expectShown([second.id, first.id]);
  });

  it('SV-04 the sort menu orders by name both ways, as the server sorts', () => {
    savedIds({ sort: 'NAME_ASC' }).then((ascending) => {
      savedIds({ sort: 'NAME_DESC' }).then((descending) => {
        expect(descending, 'Z to A is A to Z reversed').to.deep.equal([...ascending].reverse());
        visitAndWait('/saved', 'SavedItems');
        cy.byTestId('saved-items-toolbar-sort').click();
        cy.byTestId('saved-items-toolbar-sort-menu').should('be.visible');
        cy.byTestId('saved-items-toolbar-sort-RECENT').should('have.text', 'Recently saved');
        cy.byTestId('saved-items-toolbar-sort-NAME_ASC').should('have.text', 'Name · A to Z').click();
        cy.byTestId('saved-items-toolbar-sort-menu').should('not.exist');
        expectShown(ascending);
        cy.byTestId('saved-items-toolbar-sort').click();
        cy.byTestId('saved-items-toolbar-sort-NAME_DESC').should('have.text', 'Name · Z to A').click();
        expectShown(descending);
      });
    });
  });

  it('SV-05 filtering by a super category shows what the server keeps for it, and Reset brings every pod back', () => {
    visitAndWait('/saved', 'SavedItems');
    cy.byTestId('saved-items-toolbar-filter').click();
    cy.byTestId('saved-items-toolbar-filter-popover').should('be.visible');
    cy.byTestId('saved-items-toolbar-filter-reset').should('be.disabled');
    savedIds({ categoryId: firstSuperId }).then((kept) => {
      expect(kept, 'the first pod is in its own club super category').to.include(first.id);
      cy.byTestId('saved-items-toolbar-filter-super').click();
      cy.byTestId(`saved-items-toolbar-filter-super-option-${firstSuperId}`).click();
      expectShown(kept);
      cy.byTestId('saved-items-toolbar-filter-reset').should('be.enabled');
    });
    cy.then(() => {
      if (!otherSuperId) throw new Error('Staging prerequisite: a second super category to filter by.');
      savedIds({ categoryId: otherSuperId }).then((kept) => {
        cy.byTestId('saved-items-toolbar-filter-super').click();
        cy.byTestId(`saved-items-toolbar-filter-super-option-${otherSuperId}`).click();
        expectShown(kept);
      });
    });
    cy.byTestId('saved-items-toolbar-filter-reset').click();
    expectShown([second.id, first.id]);
    cy.byTestId('saved-items-toolbar-filter-reset').should('be.disabled');
  });

  it('SV-06 a saved card opens its pod', () => {
    visitAndWait('/saved', 'SavedItems');
    cy.byTestId(`saved-item-card-${first.id}-action`).click();
    cy.location('pathname').should('eq', podPath(first));
  });

  it('SV-07 an unsaved pod is no longer listed', () => {
    setSaved(first.id, false);
    visitAndWait('/saved', 'SavedItems');
    expectShown([second.id]);
    cy.byTestId(`saved-item-card-${first.id}`).should('not.exist');
  });
});
