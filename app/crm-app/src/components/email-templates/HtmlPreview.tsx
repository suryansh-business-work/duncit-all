import { WebView } from 'react-native-webview';
import { YStack } from 'tamagui';

import { RADII } from '@/constants/design';

interface Props {
  html: string;
  /** What the frame shows, for screen readers. */
  label: string;
  /** Take all the room its parent gives instead of the fixed preview height. */
  fill?: boolean;
  testID?: string;
}

/** The portal's preview frame height. */
const PREVIEW_HEIGHT = 460;

/**
 * Rendered email HTML, as the portal's sandboxed preview frame shows it, with
 * scripts off.
 */
export function HtmlPreview({ html, label, fill = false, testID }: Readonly<Props>) {
  return (
    <YStack
      {...(fill ? { flex: 1 } : { height: PREVIEW_HEIGHT })}
      borderRadius={RADII.md}
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
      aria-label={label}
    >
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled={false}
        accessibilityLabel={label}
        testID={testID}
      />
    </YStack>
  );
}
