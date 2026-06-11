import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthAvatarsStrip } from '@/components/AuthAvatarsStrip';
import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { LoginForm, type LoginFormValues } from '@/forms/login';
import type { RootStackParamList } from '@/navigation/types';
import { login as loginService, loginWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Setting the token + survey flag flips the navigation gate to the survey or
  // app group automatically — no imperative navigation needed.
  const handleSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginService(values);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      setError(toErrorMessage(e, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setError(null);
    try {
      const result = await loginWithGoogle(idToken);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      setError(toErrorMessage(e, 'Google sign-in failed'));
    }
  };

  return (
    <AuthScaffold
      testID="login-screen"
      title="Welcome"
      accentWord="back."
      subtitle="Pick up where you left off and find pods around you."
    >
      <AuthAvatarsStrip caption="New pods are waiting for your crew today" />
      <LoginForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
      <XStack justifyContent="flex-end">
        <Text
          testID="go-forgot-password"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          Forgot password?
        </Text>
      </XStack>
      <AuthDivider />
      <GoogleAuthButton label="Sign in with Google" onIdToken={handleGoogle} onError={setError} />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          New here?
        </Text>
        <Text
          testID="go-signup"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => navigation.navigate('Signup')}
        >
          Create one
        </Text>
      </XStack>
      <LegalLinks prefix="By signing in," />
    </AuthScaffold>
  );
}
