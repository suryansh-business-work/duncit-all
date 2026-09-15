import { runMarker } from '@duncit/utils';
import { fill, openMenu, prerequisite, tap } from '../support/flows';
import { runAccount } from '../support/run-account';

/**
 * 07 · Pod Ideas (PI), signed in with the CHANGED password: the composer's
 * refusals, a real idea filed under Super › Category › Sub, the category and
 * status filters over "Your submissions", and deleting it again. The idea's
 * title and description carry the run marker (`[E2E <stamp> native]`).
 *
 * Native web: src/screens/PodIdeasScreen over src/components/pod-ideas
 * (IdeaComposerSheet, CategoryCascadeField, IdeaStatusFilter, IdeasList,
 * IdeaCard, IdeaDeleteConfirm).
 */

const CATEGORY_TREE = `query E2eCategoryTree {
  supers: categories(filter: { level: SUPER }) { id is_active }
  categories: categories(filter: { level: CATEGORY }) { id parent_id is_active }
  subs: categories(filter: { level: SUB }) { id parent_id is_active }
}`;
type CategoryRow = { id: string; parent_id?: string | null; is_active: boolean };
type CategoryTree = { supers: CategoryRow[]; categories: CategoryRow[]; subs: CategoryRow[] };

interface IdeaCategories {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
  /** Another active super category to filter away to, or '' when there is none. */
  other_super_category_id: string;
}

const activeUnder = (rows: CategoryRow[], parentId: string) =>
  rows.filter((row) => row.is_active && row.parent_id === parentId);

/** The first Super › Category › Sub chain the composer can complete. */
function ideaCategories(tree: CategoryTree): IdeaCategories | undefined {
  const supers = tree.supers.filter((row) => row.is_active);
  for (const superRow of supers) {
    for (const category of activeUnder(tree.categories, superRow.id)) {
      const sub = activeUnder(tree.subs, category.id)[0];
      if (sub) {
        return {
          super_category_id: superRow.id,
          category_id: category.id,
          sub_category_id: sub.id,
          other_super_category_id: supers.find((row) => row.id !== superRow.id)?.id ?? '',
        };
      }
    }
  }
  return undefined;
}

// One board: the composer and the list it files into only exist inside the
// page that opened them, so the scenarios share it rather than each reloading.
describe('Native · 07 pod ideas', { testIsolation: false }, () => {
  const account = runAccount();
  const marker = runMarker(account.stamp, 'native');
  const TITLE = `${marker} Sunrise badminton doubles`;
  const DESCRIPTION = `${marker} Early doubles before work, rotating partners every set.`;
  let chain: IdeaCategories;
  let ideaId = '';

  it('PI-01 Pod Ideas opens from the menu with the category and status filters', () => {
    cy.apiLogin(account.email, account.password('CHANGED'));
    cy.gql<CategoryTree>(CATEGORY_TREE).then((tree) => {
      chain = prerequisite(
        ideaCategories(tree),
        'an active Super Category › Category › Sub Category chain',
      );
    });
    openMenu();
    cy.interceptOperation('MobilePodIdeas');
    tap('sidebar-grid-ideas');
    cy.wait('@MobilePodIdeas');
    cy.byTestId('pod-ideas-screen').should('exist');
    cy.byTestId('idea-filter-cat-cascade').should('exist');
    cy.byTestId('idea-filter-cat-super_category_id-all').should('have.text', 'All');
    cy.byTestId('idea-status-filter').should('exist');
    cy.byTestId('idea-status-ALL').should('have.attr', 'aria-pressed', 'true');
    // A new account has filed nothing yet.
    cy.byTestId('ideas-list-mine-header').should('not.exist');
  });

  it('PI-02 Share opens the composer, and Submit with nothing typed is refused', () => {
    tap('pod-ideas-add');
    cy.byTestId('idea-composer-sheet').should('be.visible');
    tap('idea-composer-submit');
    cy.byTestId('idea-composer-error').should(
      'have.text',
      'Title and description are both required.',
    );
  });

  it('PI-03 a title and description with no categories are refused; each level waits for its parent', () => {
    fill('idea-title-input', TITLE);
    fill('idea-description-input', DESCRIPTION);
    tap('idea-composer-submit');
    cy.byTestId('idea-composer-error').should(
      'have.text',
      'Please select a Super Category, Category and Sub Category.',
    );
    cy.byTestId(`idea-composer-cat-super_category_id-${chain.super_category_id}`).should('exist');
    cy.byTestIdPrefix('idea-composer-cat-category_id-').should('not.exist');
    cy.byTestIdPrefix('idea-composer-cat-sub_category_id-').should('not.exist');
  });

  it('PI-04 Super › Category › Sub and Submit file the idea under Your submissions, pending', () => {
    cy.interceptOperation('SurveyOnboardingCategories');
    tap(`idea-composer-cat-super_category_id-${chain.super_category_id}`);
    cy.wait('@SurveyOnboardingCategories');
    tap(`idea-composer-cat-category_id-${chain.category_id}`);
    cy.wait('@SurveyOnboardingCategories');
    tap(`idea-composer-cat-sub_category_id-${chain.sub_category_id}`);

    cy.interceptOperation('MobileCreatePodIdea');
    tap('idea-composer-submit');
    cy.wait('@MobileCreatePodIdea')
      .its('response.body.data.createPodIdea.id')
      .then((id) => {
        ideaId = String(id);
        cy.byTestId('idea-composer-sheet').should('not.exist');
        cy.byTestId('ideas-list-mine-header-title').should('have.text', 'Your submissions');
        cy.byTestId(`idea-card-${ideaId}`).should('contain', TITLE).and('contain', DESCRIPTION);
        cy.byTestId(`idea-card-status-${ideaId}`).should('have.text', 'PENDING');
      });
  });

  it('PI-05 the category filter and the status filter narrow Your submissions', () => {
    tap(`idea-filter-cat-super_category_id-${chain.super_category_id}`);
    tap(`idea-filter-cat-category_id-${chain.category_id}`);
    tap(`idea-filter-cat-sub_category_id-${chain.sub_category_id}`);
    cy.byTestId(`idea-card-${ideaId}`).should('exist');
    if (chain.other_super_category_id) {
      tap(`idea-filter-cat-super_category_id-${chain.other_super_category_id}`);
      cy.byTestId(`idea-card-${ideaId}`).should('not.exist');
    } else {
      cy.log('Only one super category is active, so there is none to filter away to.');
    }
    tap('idea-filter-cat-super_category_id-all');
    cy.byTestId(`idea-card-${ideaId}`).should('exist');

    tap('idea-status-APPROVED');
    cy.byTestId('idea-status-APPROVED').should('have.attr', 'aria-pressed', 'true');
    cy.byTestId(`idea-card-${ideaId}`).should('not.exist');
    tap('idea-status-PENDING');
    cy.byTestId(`idea-card-status-${ideaId}`).should('have.text', 'PENDING');
    tap('idea-status-ALL');
    cy.byTestId(`idea-card-${ideaId}`).should('exist');
  });

  it('PI-06 Delete asks first: Cancel keeps the idea, Delete removes it', () => {
    tap(`idea-delete-${ideaId}`);
    cy.byTestId('idea-delete-confirm').should('be.visible');
    cy.byTestId('idea-delete-confirm-title').should('have.text', 'Delete this idea?');
    tap('idea-delete-cancel');
    cy.byTestId('idea-delete-confirm').should('not.exist');
    cy.byTestId(`idea-card-${ideaId}`).should('exist');

    tap(`idea-delete-${ideaId}`);
    cy.interceptOperation('MobileDeletePodIdea');
    tap('idea-delete-confirm-btn');
    cy.wait('@MobileDeletePodIdea');
    cy.byTestId('idea-delete-confirm').should('not.exist');
    cy.byTestId(`idea-card-${ideaId}`).should('not.exist');
  });
});
