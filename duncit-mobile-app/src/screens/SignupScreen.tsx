import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack } from 'tamagui';

import { AuthDivider } from '@/components/AuthDivider';
import { AuthScaffold } from '@/components/AuthScaffold';
import { GoogleAuthButton } from '@/components/GoogleAuthButton';
import { LegalLinks } from '@/components/LegalLinks';
import { SignupForm, type SignupFormValues } from '@/forms/signup';
import type { RootStackParamList } from '@/navigation/types';
import { register, signupWithGoogle } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { toErrorMessage } from '@/utils/errors';

export function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const authenticate = useAuthStore((s) => s.authenticate);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // New accounts always land on the survey (surveyCompleted === false).
  const handleSubmit = async (values: SignupFormValues) => {
    setError(null);
    setLoading(true);
    try {
      const result = await register({
        name: values.name,
        birthYear: values.birthYear,
        email: values.email,
        password: values.password,
      });
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
      const result = await signupWithGoogle(idToken);
      authenticate(result.token, result.surveyCompleted);
    } catch (e) {
      setError(toErrorMessage(e, 'Google sign-in failed'));
    }
  };

  return (
    <AuthScaffold
      testID="signup-screen"
      title="Join"
      accentWord="Duncit."
      subtitle="Create your account to discover pods nearby."
    >
      <GoogleAuthButton onIdToken={handleGoogle} onError={setError} />
      <AuthDivider />
      <SignupForm loading={loading} errorMessage={error} onSubmit={handleSubmit} />
      <XStack justifyContent="center" gap={4}>
        <Text fontSize={14} color="$muted">
          Already have an account?
        </Text>
        <Text
          testID="go-login"
          fontSize={14}
          fontWeight="600"
          color="$primary"
          onPress={() => navigation.navigate('Login')}
        >
          Log in
        </Text>
      </XStack>
      <LegalLinks prefix="By signing up," />
    </AuthScaffold>
  );
}
