/// <reference types="cypress" />

/**
 * Pod Ideas (`PodIdeasPage`): the composer dialog and the list filter both draw
 * the same Super › Category › Sub cascade (`CategoryCascade`), so its ids repeat
 * on one page — every pick is scoped to `idea-composer-dialog` or
 * `pod-ideas-page-filter`. The options open in a popper outside either, as
 * `category-cascade-<level>-option-<id>`. Each level after the first loads when
 * its parent is picked, and a pick waits for that read.
 */

const CATEGORIES_QUERY = `query E2eIdeaCategories($level: CategoryLevel!, $parent_id: ID) {
  categories(filter: { level: $level, parent_id: $parent_id }) { id name is_active }
}`;

const CREATE_IDEA_MUTATION = `mutation E2eCreatePodIdea($input: CreatePodIdeaInput!) {
  createPodIdea(input: $input) { id }
}`;

const IDEAS_QUERY = `query E2eApprovedIdeas($filter: PodIdeaFilterInput) {
  podIdeas(filter: $filter) { id sub_category_id }
}`;

type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

/** The two places the cascade is drawn. */
export type CascadeScope = 'idea-composer-dialog' | 'pod-ideas-page-filter';

export interface CategoryRow {
  id: string;
  name: string;
  is_active: boolean | null;
}

export interface CategoryPath {
  superCategory: CategoryRow;
  category: CategoryRow;
  sub: CategoryRow;
}

interface ParentAndChild {
  parent: CategoryRow;
  child: CategoryRow;
}

/** Makes every read-wait alias unique, so an earlier pick can never answer a later wait. */
let watches = 0;

const activeRows = (level: CategoryLevel, parentId: string | null) =>
  cy
    .gql<{ categories: CategoryRow[] }>(CATEGORIES_QUERY, { level, parent_id: parentId })
    .then((data) => data.categories.filter((row) => row.is_active !== false));

/** The first parent in `parents` with an active child at `level`, and that child. */
function firstWithChild(
  level: 'CATEGORY' | 'SUB',
  parents: readonly CategoryRow[],
  index = 0,
): Cypress.Chainable<ParentAndChild | null> {
  if (index >= parents.length) return cy.wrap<ParentAndChild | null>(null, { log: false });
  const parent = parents[index];
  return activeRows(level, parent.id).then((children): Cypress.Chainable<ParentAndChild | null> => {
    if (children.length > 0) return cy.wrap<ParentAndChild | null>({ parent, child: children[0] }, { log: false });
    return firstWithChild(level, parents, index + 1);
  });
}

function pathUnder(supers: readonly CategoryRow[], index = 0): Cypress.Chainable<CategoryPath | null> {
  if (index >= supers.length) return cy.wrap<CategoryPath | null>(null, { log: false });
  const superCategory = supers[index];
  return activeRows('CATEGORY', superCategory.id)
    .then((categories) => firstWithChild('SUB', categories))
    .then((found): Cypress.Chainable<CategoryPath | null> => {
      if (found) {
        return cy.wrap<CategoryPath | null>({ superCategory, category: found.parent, sub: found.child }, { log: false });
      }
      return pathUnder(supers, index + 1);
    });
}

/** A whole active Super › Category › Sub path, which every idea must name. */
export const ideaCategoryPath = () =>
  activeRows('SUPER', null)
    .then((supers) => pathUnder(supers))
    .then((path) => {
      if (!path) {
        throw new Error(
          'Staging prerequisite: no active Super Category › Category › Sub Category path (Admin > Categories), so no pod idea can be filed.',
        );
      }
      return path;
    });

/** An active Super Category other than `id`, or null when there is only the one. */
export const otherSuperCategory = (id: string): Cypress.Chainable<CategoryRow | null> =>
  activeRows('SUPER', null).then((supers) =>
    cy.wrap<CategoryRow | null>(supers.find((row) => row.id !== id) ?? null, { log: false }),
  );

/** The approved ideas filed under one sub category — what the public list shows for it. */
export const approvedIdeaIdsIn = (subCategoryId: string) =>
  cy
    .gql<{ podIdeas: Array<{ id: string; sub_category_id: string | null }> }>(IDEAS_QUERY, {
      filter: { status: 'APPROVED' },
    })
    .then((data) => data.podIdeas.filter((idea) => idea.sub_category_id === subCategoryId).map((idea) => idea.id));

/** File an idea through the API — the precondition for a scenario about an idea that already exists. */
export const fileIdea = (title: string, description: string, path: Readonly<CategoryPath>) =>
  cy
    .gql<{ createPodIdea: { id: string } }>(CREATE_IDEA_MUTATION, {
      input: {
        title,
        description,
        super_category_id: path.superCategory.id,
        category_id: path.category.id,
        sub_category_id: path.sub.id,
        super_category_name: path.superCategory.name,
        category_name: path.category.name,
        sub_category_name: path.sub.name,
      },
    })
    .then((data) => data.createPodIdea.id);

/** Alias the page's next read of one level under one parent — once, and only if nothing claimed it. */
function watchLevel(level: CategoryLevel, parentId: string): string {
  watches += 1;
  const alias = `categories-${level}-${watches}`;
  let claimed = false;
  cy.intercept({ method: 'POST', url: String(Cypress.env('GRAPHQL_URL')) }, (req) => {
    const body = req.body as { operationName?: string; variables?: { level?: string; parent_id?: string } } | undefined;
    const matches =
      body?.operationName === 'SurveyGateCategories' &&
      body.variables?.level === level &&
      body.variables?.parent_id === parentId;
    if (claimed || req.alias || !matches) return;
    claimed = true;
    req.alias = alias;
  });
  return alias;
}

/** Open one level's box in `scope`, pick an option, and wait for the level it unlocks. */
function pickLevel(scope: CascadeScope, level: 'super' | 'category' | 'sub', id: string, unlocks?: CategoryLevel): void {
  const alias = unlocks ? watchLevel(unlocks, id) : '';
  cy.byTestId(scope).within(() => {
    cy.byTestId(`category-cascade-${level}`).click();
  });
  cy.byTestId(`category-cascade-${level}-option-${id}`).click();
  if (alias) cy.wait(`@${alias}`);
}

/** Pick a Super Category alone — the filter then matches on that level. */
export function pickSuperCategory(scope: CascadeScope, superCategoryId: string): void {
  pickLevel(scope, 'super', superCategoryId, 'CATEGORY');
}

/** Pick the whole path in `scope`. */
export function pickCategoryPath(scope: CascadeScope, path: Readonly<CategoryPath>): void {
  pickSuperCategory(scope, path.superCategory.id);
  pickLevel(scope, 'category', path.category.id, 'SUB');
  pickLevel(scope, 'sub', path.sub.id);
}
