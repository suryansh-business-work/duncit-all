import type { Control } from 'react-hook-form';
import type { GigCategory, GigJobFormValues, GigPosterRole } from '@duncit/utils';

export interface GigJobFormProps {
  initialValues: GigJobFormValues;
  categories: readonly GigCategory[];
  /** The roles the viewer may post as — the "Posting as" choices. */
  posterRoles: readonly GigPosterRole[];
  editing: boolean;
  busy: boolean;
  errorMessage: string | null;
  onSubmit: (values: GigJobFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export interface GigJobSectionProps {
  control: Control<GigJobFormValues>;
}
