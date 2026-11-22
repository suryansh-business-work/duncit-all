import type { useTranslation } from '@duncit/shell';
import type { CrmLeadQualityConfigInput } from '@duncit/gql-types';
import type { LeadQualityConfig, LeadQualityIssue } from '../../api/leadQuality.gql';
import type { LeadQualityConfigFormValues } from './lead-quality-config.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** What Save draft and Publish hand to the page: the exact API input and whether it differs from what was loaded. */
export interface LeadQualitySubmission {
  input: CrmLeadQualityConfigInput;
  change_note: string;
  /** True when the form holds edits the stored draft does not have yet (publishing saves them first). */
  dirty: boolean;
}

export interface LeadQualityConfigFormProps {
  /** The version being edited (the draft) or shown (the published one, read-only). */
  config: LeadQualityConfig;
  /** No draft yet: every field is locked until the admin starts one. */
  readOnly?: boolean;
  /** A save or publish is running. */
  busy?: boolean;
  /** Problems the server refused the last save with (`extensions.issues`), put back on their fields. */
  serverIssues?: readonly LeadQualityIssue[];
  onSaveDraft: (submission: LeadQualitySubmission) => void;
  /** Called only once the configuration passes the publish rules (exactly 100%). */
  onPublish: (submission: LeadQualitySubmission) => void;
}

export type { LeadQualityConfigFormValues };
