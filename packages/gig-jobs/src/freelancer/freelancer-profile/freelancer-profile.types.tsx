import type { FreelancerFormValues, GigCategory } from '@duncit/utils';

export interface FreelancerProfileFormProps {
  initialValues: FreelancerFormValues;
  categories: readonly GigCategory[];
  /** True once a profile exists — the button reads "Save profile" rather than "Join". */
  joined: boolean;
  busy: boolean;
  errorMessage: string | null;
  onSubmit: (values: FreelancerFormValues) => void | Promise<void>;
}
