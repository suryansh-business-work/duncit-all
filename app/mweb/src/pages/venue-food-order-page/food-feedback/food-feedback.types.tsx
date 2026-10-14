import type { FoodFeedbackValues } from '@duncit/forms/schemas';

// The schema, its values and its defaults are shared with the native app, so
// they live in @duncit/forms/schemas; this file keeps only the form's props.
export { foodFeedbackDefaults, makeFoodFeedbackSchema, type FoodFeedbackValues } from '@duncit/forms/schemas';

export interface FoodFeedbackFormProps {
  /** Named in the form's opening line: the rating goes to this venue. */
  venueName: string;
  /** A photo is on its way up: Send waits for it. */
  uploading: boolean;
  submitting: boolean;
  /** An upload or the send failed — already a sentence. */
  error: string | null;
  onDismissError: () => void;
  /** One photo up; its address back, or null when it could not be uploaded. */
  onUploadPhoto: (file: File) => Promise<string | null>;
  onSubmit: (values: FoodFeedbackValues) => void | Promise<void>;
}
