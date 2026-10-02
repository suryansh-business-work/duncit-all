import { useEffect } from 'react';
import { hostCategoryKeyOf } from '../create-pod.form';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

/** Keeps the form in step with the flags and the host's categories. */
export function useStepperFormSync(
  form: CreatePodForm,
  showProducts: boolean,
  hostCategories: CreatePodHostCategory[]
) {
  // With products gated off, drop any product values a stale draft may carry.
  useEffect(() => {
    if (showProducts) return;
    if (form.getValues('products_enabled') || form.getValues('product_requests').length > 0) {
      form.setValue('products_enabled', false);
      form.setValue('product_requests', []);
    }
  }, [showProducts, form]);

  // A host with a single onboarded category has it auto-selected, so they never
  // see the extra choice; multi-category hosts must pick (enforced in next()).
  useEffect(() => {
    const sole = hostCategories[0];
    if (hostCategories.length === 1 && sole && !form.getValues('host_category_key')) {
      form.setValue('host_category_key', hostCategoryKeyOf(sole));
    }
  }, [hostCategories, form]);
}
