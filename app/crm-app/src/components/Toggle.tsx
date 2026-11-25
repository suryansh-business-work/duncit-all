import { Switch } from 'tamagui';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What it switches, for screen readers. */
  label: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * Every on/off switch in the app, in the portal's colours: the accent track
 * with a light knob when on, a quiet outlined track with a muted knob when
 * off — so the two states read apart in light and in dark mode (the bare
 * Tamagui track vanished on the dark surfaces).
 */
export function Toggle({ checked, onChange, label, disabled = false, testID }: Readonly<Props>) {
  return (
    <Switch
      size="$3"
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={label}
      backgroundColor={checked ? '$primary' : '$soft'}
      borderWidth={1}
      borderColor={checked ? '$primary' : '$inputBorder'}
      opacity={disabled ? 0.5 : 1}
      testID={testID}
    >
      <Switch.Thumb backgroundColor={checked ? '$onPrimary' : '$muted'} />
    </Switch>
  );
}
