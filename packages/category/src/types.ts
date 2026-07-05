/** The three cascading levels of the category tree. */
export type CategoryLevel = 'super' | 'category' | 'sub';

/** One admin-managed Category document (Super / Category / Sub). */
export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
  level: 'SUPER' | 'CATEGORY' | 'SUB';
  parent_id?: string | null;
}

/**
 * The structured value the picker emits. Consumers read only what they persist
 * — e.g. a Club stores super_id (super_category_id) + sub_id (category_id) — but
 * the picker always fills the whole shape from the admin tree so nothing drifts.
 */
export interface AdminCategoryValue {
  super_id: string;
  super_name: string;
  /** The middle CATEGORY level (narrows the sub list). */
  category_id: string;
  category_name: string;
  sub_id: string;
  sub_name: string;
}

export const EMPTY_CATEGORY: AdminCategoryValue = {
  super_id: '',
  super_name: '',
  category_id: '',
  category_name: '',
  sub_id: '',
  sub_name: '',
};
