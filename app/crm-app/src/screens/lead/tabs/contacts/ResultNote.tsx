import { Text } from 'tamagui';

/** What the server said about the last email (the portal's snackbar), announced politely. */
export function ResultNote({
  result,
}: Readonly<{ result: { message: string; ok: boolean } | null }>) {
  if (!result) return null;
  return (
    <Text
      aria-live="polite"
      role="status"
      color={result.ok ? '$success' : '$danger'}
      fontWeight="600"
      testID="compose-result"
    >
      {result.message}
    </Text>
  );
}
