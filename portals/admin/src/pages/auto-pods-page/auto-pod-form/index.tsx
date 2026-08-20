/**
 * The Auto Pod template form now lives in `@duncit/auto-pods` — the Partners
 * console opens Auto Pods too, and rule 40 puts the second consumer in the
 * shared package rather than in a copy. Only the admin's category cascade stays
 * here; everything else is re-exported so the page's own imports are unchanged.
 */
export { default as AutoPodForm } from './AdminAutoPodForm';
export {
  autoPodSchema,
  emptyAutoPodForm,
  parseHashtags,
  parseMediaLines,
  toAutoPodForm,
  toAutoPodInput,
  type AutoPodFormValues,
  type AutoPodMedia,
} from '@duncit/auto-pods';
