import { Component, type ErrorInfo, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { DuncitButton } from '@/components/DuncitButton';
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
      gap={16}
      padding={24}
      backgroundColor="$background"
    >
      <YStack
        width={96}
        height={96}
        borderRadius={48}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$surface"
      >
        <MaterialIcons name="error-outline" size={44} color={semantic.error} />
      </YStack>
      <Text fontSize={20} fontWeight="600" color="$color" textAlign="center">
        {t('mweb.errorBoundary.somethingWentWrong')}
      </Text>
      <DuncitButton
        testID="error-boundary-retry"
        label={t('mweb.errorBoundary.tryAgain')}
        onPress={onRetry}
        size="lg"
      />
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
