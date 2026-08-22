import { Text } from 'tamagui';

export interface RequiredMarkProps {
  /** When true a red `*` is rendered; nothing otherwise. */
  required?: boolean;
  /** Base test id: the mark gets `${testID}-required`. */
  testID?: string;
}

/**
 * The red required `*`, on its own so a field that draws its own label line —
 * the grievance form, whose captions mirror mWeb's smaller MUI labels — marks
 * itself with the same marker instead of repeating it (rule 34). Nested inside
 * a label `Text` it inherits that label's size and weight and overrides only
 * the colour.
 */
export function RequiredMark({ required, testID }: Readonly<RequiredMarkProps>) {
  if (!required) return null;
  return (
    <Text color="$danger" testID={testID ? `${testID}-required` : undefined}>
      {' *'}
    </Text>
  );
}

export interface FieldLabelProps {
  /** The field label text. */
  label: string;
  /** When true, a red `*` is suffixed after the label to mark the field required. */
  required?: boolean;
  /** Base test id: the text gets `${testID}-label`, the mark `${testID}-required`. */
  testID?: string;
}

/**
 * The label line every mobile field renders — the label text followed by an
 * optional red required `*`. Centralises the required marker (rule 34) so bespoke
 * controls (chip lists, media picker, selectors, date pickers) match the plain
 * text fields; the marker always sits on the label, never on the input.
 */
export function FieldLabel({ label, required, testID }: Readonly<FieldLabelProps>) {
  return (
    <Text
      fontSize={14}
      fontWeight="500"
      color="$color"
      testID={testID ? `${testID}-label` : undefined}
    >
      {label}
      <RequiredMark required={required} testID={testID} />
    </Text>
  );
}
