import type { RunAccount } from '../../support/run-account';
import { CREATE_POD_IDEA, DELETE_POD_IDEA, IDEA_CATEGORIES, POD_IDEAS_LOOKUP } from '../../support/operations';
import { openTable, searchTable, tableRow } from '../../support/tables';
import { specMarker, staffAccount } from '../../support/ui-staff';

/**
 * Pods Portal › Pod ideas moderation: deleting a comment from an idea's details.
 * The idea and its comment are the run account's own — filed and commented
 * through the API with this spec's marker — and `after()` deletes the idea.
 */

const ADD_COMMENT = `mutation E2eAddPodIdeaComment($id: ID!, $text: String!) {
  addPodIdeaComment(pod_idea_doc_id: $id, text: $text) { id comments { id text } }
}`;

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

/** The first Sub whose Category and Super both exist — an idea must name all three. */
function categoryInput(data: IdeaCategories): Record<string, string> {
  for (const sub of data.subs) {
    const category = data.categories.find((row) => row.id === sub.parent_id);
    const superCategory = category && data.supers.find((row) => row.id === category.parent_id);
    if (category && superCategory) {
      return {
        super_category_id: superCategory.id,
        category_id: category.id,
        sub_category_id: sub.id,
        super_category_name: superCategory.name,
        category_name: category.name,
        sub_category_name: sub.name,
      };
    }
  }
  throw new Error('No Super › Category › Sub path exists on this server to file a pod idea under.');
}

describe('Pods Portal · Pod ideas moderation (run account, password CHANGED)', () => {
  let account: RunAccount;
  let marker = '';

  before(() => {
    account = staffAccount();
    marker = specMarker(account, 'pods-ideas');
  });

  beforeEach(() => {
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
  });

  after(() => {
    if (!marker) return;
    cy.apiPortalLogin('pods', account.email, account.password('CHANGED'));
    cy.gql<{ podIdeasTable: { rows: { id: string; title: string }[] } }>(POD_IDEAS_LOOKUP, {
      query: { search: marker, page: 1, page_size: 25 },
    }).then((data) => {
      for (const idea of data.podIdeasTable.rows.filter((row) => row.title.includes(marker))) {
        cy.gql(DELETE_POD_IDEA, { id: idea.id });
      }
    });
  });

  it('PID-01 a comment is deleted after "Delete this comment?", and an idea without comments reads "No comments yet."', () => {
    const title = `${marker} idea with a comment`;
    const text = `${marker} comment to delete`;
    cy.gql<IdeaCategories>(IDEA_CATEGORIES)
      .then((categories) =>
        cy.gql<{ createPodIdea: { id: string } }>(CREATE_POD_IDEA, {
          input: { title, description: 'Filed by the staff portals suite.', ...categoryInput(categories) },
        }),
      )
      .then(({ createPodIdea }) =>
        cy.gql<{ addPodIdeaComment: { id: string; comments: { id: string; text: string }[] } }>(ADD_COMMENT, {
          id: createPodIdea.id,
          text,
        }),
      )
      .then(({ addPodIdeaComment }) => {
        const idea = addPodIdeaComment;
        const comment = idea.comments.find((c) => c.text === text);
        expect(comment, 'the comment was added').to.not.be.undefined;
        const commentId = String(comment?.id);

        openTable('pods', '/pod-ideas', 'AdminPodIdeasTable');
        searchTable('AdminPodIdeasTable', marker);
        tableRow('admin-pod-ideas', idea.id, [title]);
        cy.interceptOperation('AdminPodIdeaDetails');
        cy.byTestId(`pod-idea-view-${idea.id}`).click();
        cy.wait('@AdminPodIdeaDetails');
        cy.byTestId(`idea-comment-${commentId}`).should('contain.text', text);

        cy.byTestId(`idea-comment-${commentId}`).within(() => cy.byTestId('idea-comment-delete').click());
        cy.byTestId('idea-comment-delete-title').should('have.text', 'Delete this comment?');
        cy.interceptOperation('AdminDeletePodIdeaComment');
        cy.byTestId('idea-comment-delete-confirm').should('have.text', 'Delete').click();
        cy.wait('@AdminDeletePodIdeaComment').its('response.body.errors').should('be.undefined');
        cy.byTestId('idea-comment-delete-dialog').should('not.exist');
        cy.byTestId(`idea-comment-${commentId}`).should('not.exist');
        cy.byTestId('idea-comments-empty').should('have.text', 'No comments yet.');
      });
  });
});
