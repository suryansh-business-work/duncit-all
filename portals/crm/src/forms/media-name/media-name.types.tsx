import type { useTranslation } from '@duncit/shell';
import type { MediaNameFormValues } from './media-name.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface MediaNameFormProps {
  /** Shown as a dialog while true. */
  open: boolean;
  /** The current name, prefilled. */
  initialName: string;
  submitting?: boolean;
  /** A save error from the server, shown above the field. */
  error?: string | null;
  onSubmit: (values: MediaNameFormValues) => void;
  onClose: () => void;
}

export type { MediaNameFormValues };
