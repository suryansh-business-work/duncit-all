import { Component, type ErrorInfo, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
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
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info.componentStack);
  }

  private readonly reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

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
        <MaterialIcons name="error-outline" size={48} color="#b3261e" />
        <Text fontSize={20} fontWeight="900" color="$color" textAlign="center">
          Something went wrong
        </Text>
        <Text fontSize={14} color="$muted" textAlign="center">
          An unexpected error occurred. Please try again.
        </Text>
        <YStack
          testID="error-boundary-retry"
          role="button"
          aria-label="Try again"
          onPress={this.reset}
          paddingHorizontal={20}
          paddingVertical={12}
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={14} fontWeight="900" color="$onPrimary">
            Try again
          </Text>
        </YStack>
      </YStack>
    );
  }
}
