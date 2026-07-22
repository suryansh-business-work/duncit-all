export interface CategoryScope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

interface IdeaCategoryIds {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
}

/**
 * Client-side category filter for the pod-idea list: the deepest selected level
 * wins (Sub narrows Category narrows Super); an empty scope matches everything.
 */
export function ideaMatchesScope(idea: IdeaCategoryIds, scope: CategoryScope): boolean {
  if (scope.sub_category_id) return idea.sub_category_id === scope.sub_category_id;
  if (scope.category_id) return idea.category_id === scope.category_id;
  if (scope.super_category_id) return idea.super_category_id === scope.super_category_id;
  return true;
}

interface IdeaCategoryNames {
  super_category_name?: string | null;
  category_name?: string | null;
  sub_category_name?: string | null;
}

/** "For You › Sports › Badminton" from whichever category levels are named. */
export function categoryPathLabel(idea: IdeaCategoryNames): string {
  return [idea.super_category_name, idea.category_name, idea.sub_category_name]
    .filter((n): n is string => !!n && n.trim().length > 0)
    .join(' › ');
}
