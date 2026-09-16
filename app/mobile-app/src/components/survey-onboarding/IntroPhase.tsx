import { WebView } from 'react-native-webview';
import { YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { LoadingIndicator } from '@/components/LoadingIndicator/LoadingIndicator';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  html: string;
  loading: boolean;
  onContinue: () => void;
}

/** Minimal page around the admin-authored HTML fragment, themed to match the
 * app's current colors — the fragment itself carries no page chrome. */
function wrapIntroHtml(html: string, background: string, color: string, primary: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { margin: 0; padding: 16px; background: ${background}; color: ${color};
        font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.5; }
      a { color: ${primary}; }
      img { max-width: 100%; height: auto; }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid ${color}; padding: 6px; }
    </style>
  </head><body>${html}</body></html>`;
}

/** First screen of each onboarding flow — the admin-authored intro copy
 * (Onboarding Portal > Settings), shown before the category picker. Skipped
 * entirely by the caller when a kind's intro field is blank. */
export function IntroPhase({ html, loading, onContinue }: Readonly<Props>) {
  const { t } = useTranslation();
  const bottomInset = useBottomInset();
  const { background, color, primary } = useThemeColors();

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" testID="intro-loading">
        <LoadingIndicator />
      </YStack>
    );
  }

  return (
    <YStack flex={1} testID="intro-phase">
      <YStack flex={1}>
        <WebView
          testID="intro-webview"
          originWhitelist={['*']}
          source={{ html: wrapIntroHtml(html, background, color, primary) }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
        />
      </YStack>
      <YStack padding={16} paddingBottom={bottomInset + 16}>
        <DuncitButton
          testID="primary-action"
          label={t('mweb.common.continue')}
          size="lg"
          fullWidth
          onPress={onContinue}
        />
      </YStack>
    </YStack>
  );
}
