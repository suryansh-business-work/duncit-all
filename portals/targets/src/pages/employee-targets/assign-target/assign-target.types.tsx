import type { Control } from 'react-hook-form';
import type { useTranslation } from '@duncit/shell';
import type { EmployeeTargetRecord } from '@duncit/utils';
import type { AssigneeOption } from '../../../lib/employee-target-queries';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** One goal row as it is typed — the figure stays text until the schema reads it. */
export interface GoalValues {
  title: string;
  description: string;
  target_value: string;
  unit: string;
}

export interface AssignTargetFormValues {
  employee: AssigneeOption | null;
  month: Date | null;
  goals: GoalValues[];
  notes: string;
}

/** What a valid form becomes: the API's own field names. */
export interface AssignTargetOutput {
  employee_id: string;
  month: string;
  goals: { title: string; description: string; target_value: number | null; unit: string }[];
  notes: string;
}

export type AssignTargetControl = Control<AssignTargetFormValues, unknown, AssignTargetOutput>;

export interface AssignTargetFormProps {
  /** The target whose goals are being edited, or null to assign a new one. */
  editing: EmployeeTargetRecord | null;
  /** Resolves true once saved. */
  onSubmit: (values: AssignTargetOutput) => Promise<boolean>;
  onCancel: () => void;
}
