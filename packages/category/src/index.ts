/**
 * @duncit/category — the one common category picker.
 *
 * `AdminCategorySelect` renders a strict cascading Super → Category → Sub
 * dropdown sourced from the admin category tree, optionally wrapped in a titled
 * <fieldset> (legend + hint) so it reads as a distinct section. `RhfAdminCategory`
 * is the react-hook-form wrapper; `useCategoryValue` hydrates edit forms that
 * persist super + sub ids.
 */
export { AdminCategorySelect, type AdminCategorySelectProps } from './AdminCategorySelect';
export { RhfAdminCategory } from './RhfAdminCategory';
export { Fieldset, type FieldsetProps } from './Fieldset';
export { useAdminCategories, ADMIN_CATEGORIES } from './queries';
export { buildCategoryValue, useCategoryValue } from './resolve';
export { superOptions, categoryOptions, subOptions, type Option } from './categoryOptions';
export {
  EMPTY_CATEGORY,
  type AdminCategoryValue,
  type CategoryLevel,
  type CategoryDoc,
} from './types';
