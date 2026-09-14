import { runMarker } from '@duncit/utils';
import { assertInsideShell, openLogin, submitPassword } from '../support/login-page';
import { CREATE_POD_IDEA, DELETE_POD_IDEA, IDEA_CATEGORIES, POD_IDEAS_LOOKUP } from '../support/operations';
import { runAccount, type RunAccount } from '../support/run-account';
import { openTable, searchTable, tableRow } from '../support/tables';

/**
 * Pods portal, on its own origin (PODS_URL): Pods › Pod Ideas moderation,
 * signed in as the run account (password CHANGED), which `01-support-portal`
 * granted ALL_PODS_ACCESS.
 *
 * The member's own ideas do not survive the mWeb run, so `before()` files four
 * here through the API — one per action, each titled with this project's
 * marker (`[E2E <stamp> pods]`) and starting PENDING. `after()` deletes whatever
 * is left, because an approved idea is public and a stamped one must never
 * linger there; the purge would also remove them with their author.
 */

type IdeaAction = 'view' | 'approve' | 'reject' | 'delete';

const ACTIONS: readonly IdeaAction[] = ['view', 'approve', 'reject', 'delete'];

interface Idea {
  id: string;
  title: string;
  status: string;
}

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
}

interface IdeaCategories {
  supers: CategoryRow[];
  categories: CategoryRow[];
  subs: CategoryRow[];
}

interface CategoryPath {
  superCategory: CategoryRow;
  category: CategoryRow;
  sub: CategoryRow;
}

/** The first Sub whose Category and Super both exist — a new idea must name all three. */
function pickCategoryPath(data: IdeaCategories): CategoryPath {
  for (const sub of data.subs) {
    const category = data.categories.find((row) => row.id === sub.parent_id);
    const superCategory = category && data.supers.find((row) => row.id === category.parent_id);
    if (category && superCategory) return { superCategory, category, sub };
  }
  throw new Error('No Super › Category › Sub path exists on this server to file a pod idea under.');
}

/** File one PENDING idea per action and yield them by action. */
function createIdeas(marker: string, path: CategoryPath): Cypress.Chainable<Record<IdeaAction, Idea>> {
  const created = {} as Record<IdeaAction, Idea>;
  for (const action of ACTIONS) {
    cy.gql<{ createPodIdea: Idea }>(CREATE_POD_IDEA, {
      input: {
        title: `${marker} idea to ${action}`,
        description: `Filed by the staff portals suite to ${action} from Pods › Pod Ideas.`,
        super_category_id: path.superCategory.id,
        category_id: path.category.id,
        sub_category_id: path.sub.id,
        super_category_name: path.superCategory.name,
        category_name: path.category.name,
        sub_category_name: path.sub.name,
      },
    }).then((data) => {
      created[action] = data.createPodIdea;
    });
  }
  return cy.wrap(created, { log: false });
}

/** Pods › Pod Ideas, narrowed to this run's ideas, with the idea's row on screen. */
function openIdeas(marker: string, idea: Idea): void {
  openTable('pods', '/pod-ideas', 'AdminPodIdeasTable');
  cy.byTestId('pod-ideas-title').should('have.text', 'Pod Ideas');
  searchTable('AdminPodIdeasTable', marker);
  tableRow('admin-pod-ideas', idea.id, [idea.title]);
  cy.byTestId(`pod-idea-status-${idea.id}`).should('have.text', 'PENDING');
}

/** Approve or Reject from the Action column, and see the row take the new status. */
function moderate(idea: Idea, action: 'approve' | 'reject', status: string): void {
  cy.interceptOperation('SetPodIdeaStatus');
  cy.byTestId(`pod-idea-${action}-${idea.id}`).click();
  cy.wait('@SetPodIdeaStatus').its('response.body.data.setPodIdeaStatus.status').should('eq', status);
  cy.byTestId(`pod-idea-status-${idea.id}`).should('have.text', status);
  cy.byTestId(`pod-idea-${action}-${idea.id}`).should('not.exist');
}

describe('Pods portal · Pod Ideas moderation (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';
  let ideas: Record<IdeaAction, Idea>;

  before(() => {
    account = runAccount();
    marker = runMarker(account.stamp, 'pods');
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.gql<IdeaCategories>(IDEA_CATEGORIES)
      .then((data) => createIdeas(marker, pickCategoryPath(data)))
      .then((created) => {
        ideas = created;
      });
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  after(() => {
    // Nothing to find without a marker — and an empty search would match every idea.
    if (!marker) return;
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.gql<{ podIdeasTable: { rows: Idea[] } }>(POD_IDEAS_LOOKUP, {
      query: { search: marker, page: 1, page_size: 50 },
    }).then((data) => {
      for (const idea of data.podIdeasTable.rows.filter((row) => row.title.includes(marker))) {
        cy.gql(DELETE_POD_IDEA, { id: idea.id });
      }
    });
  });

  it('PIA-01 the run account signs in to Pods with its password and lands inside the shell', () => {
    openLogin('pods');
    submitPassword(account.email, account.password('CHANGED'));
    assertInsideShell('pods');
  });

  it('PIA-02 Action › View opens the idea’s details, and Close dismisses them', () => {
    const idea = ideas.view;
    openIdeas(marker, idea);
    cy.interceptOperation('AdminPodIdeaDetails');
    cy.byTestId(`pod-idea-view-${idea.id}`).click();
    cy.wait('@AdminPodIdeaDetails');
    cy.byTestId('pod-idea-details-dialog').should('be.visible');
    cy.byTestId('pod-idea-details-title').should('contain.text', idea.title).and('contain.text', 'PENDING');
    cy.byTestId('pod-idea-details-close').should('contain.text', 'Close').click();
    cy.byTestId('pod-idea-details-dialog').should('not.exist');
  });

  it('PIA-03 Action › Approve marks the idea APPROVED and takes its Approve action away', () => {
    const idea = ideas.approve;
    openIdeas(marker, idea);
    moderate(idea, 'approve', 'APPROVED');
  });

  it('PIA-04 Action › Reject marks the idea REJECTED and takes its Reject action away', () => {
    const idea = ideas.reject;
    openIdeas(marker, idea);
    moderate(idea, 'reject', 'REJECTED');
  });

  it('PIA-05 Action › Delete asks Delete idea? and, confirmed, removes the idea from the list', () => {
    const idea = ideas.delete;
    openIdeas(marker, idea);
    cy.byTestId(`pod-idea-delete-${idea.id}`).click();
    cy.byTestId('pod-idea-delete-dialog').should('be.visible');
    cy.byTestId('pod-idea-delete-title').should('have.text', 'Delete idea?');
    cy.interceptOperation('AdminDeletePodIdea');
    cy.byTestId('pod-idea-delete-confirm').should('contain.text', 'Delete').click();
    cy.wait('@AdminDeletePodIdea').its('response.body.data.deletePodIdea').should('eq', true);
    cy.byTestId('pod-idea-delete-dialog').should('not.exist');
    cy.byTestId(`admin-pod-ideas-row-${idea.id}`).should('not.exist');
  });
});
