import type { ExpenseOptionKind, ExpenseOptionRow } from '../../expense-config';

export interface ExpenseOptionFormValues {
  /**
   * The CONSTANT_CASE code stored on every expense filed under this option.
   * Editable only while creating — see the form's disabled state.
   */
  key: string;
  label: string;
  /** RELATED_FROM_TYPE only: which entity list the picker searches. */
  entity_source: string;
  is_active: boolean;
}

export interface ExpenseOptionFormProps {
  kind: ExpenseOptionKind;
  /** The option being edited, or null to add one. */
  option: ExpenseOptionRow | null;
  /** Entity sources the server knows how to search; empty for other kinds. */
  entitySources: string[];
  busy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (values: ExpenseOptionFormValues) => Promise<void> | void;
}
