import { Component, type ErrorInfo, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * The fallback itself, as a function component.
 *
 * A boundary has to be a class — `getDerivedStateFromError` has no hook form —
 * and a class cannot call `useTranslation`, so the copy lives out here where a
 * hook is allowed.
 */
function ErrorPanel({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID="error-boundary-fallback"
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap={14}
      padding={24}
      backgroundColor="$background"
    >
      <MaterialIcons name="error-outline" size={48} color={semantic.error} />
      <Text fontSize={20} fontWeight="700" color="$color" textAlign="center">
        {t('mweb.errorBoundary.somethingWentWrong')}
      </Text>
      <Text fontSize={14} color="$muted" textAlign="center">
        {t('mweb.errorBoundary.anUnexpectedError')}
      </Text>
      <YStack
        testID="error-boundary-retry"
        role="button"
        aria-label={t('mweb.errorBoundary.tryAgain')}
        onPress={onRetry}
        paddingHorizontal={20}
        paddingVertical={12}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {t('mweb.errorBoundary.tryAgain')}
        </Text>
      </YStack>
    </YStack>
  );
}

/**
 * App-wide error boundary — catches render/runtime errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank/crashed screen. Logs the
 * error for debugging (rule 19). The only correct path: reset and re-render.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logs.mobileApp.error('ErrorBoundary', 'componentDidCatch', {
      error,
      msg: 'ErrorBoundary caught an error',
      componentStack: info.componentStack,
    });
  }

  private readonly reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return <ErrorPanel onRetry={this.reset} />;
  }
}
