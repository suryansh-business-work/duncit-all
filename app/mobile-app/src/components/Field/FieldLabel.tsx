import { Text } from 'tamagui';

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
      {required ? (
        <Text color="$danger" testID={testID ? `${testID}-required` : undefined}>
          {' *'}
        </Text>
      ) : null}
    </Text>
  );
}
