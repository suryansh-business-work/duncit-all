import { apply } from "./e.mjs";
apply("packages/pod-form/src/components/ChipArrayField.tsx", [
  ["        placeholder={placeholder}", "        placeholder={placeholder ?? t('podForm.chipArrayField.placeholder')}"],
]);
