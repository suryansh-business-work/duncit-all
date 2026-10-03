import { LoginScreen } from '@/screens/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ReferralPromptScreen } from '@/screens/ReferralPromptScreen';
import { SignupScreen } from '@/screens/SignupScreen';
import { SurveyScreen } from '@/screens/SurveyScreen';
import { useAuthStore } from '@/stores/auth.store';
import { screenLayout } from '../screenLayout';
import { renderCoreScreens } from './coreScreens';
import { renderDiscoveryScreens } from './discoveryScreens';
import { Stack } from './stack';
import { useRootNavigatorEffects } from './useRootNavigatorEffects';

/**
 * Single stack gated by the auth store — the React Navigation replacement for
 * mWeb's AuthGuards / the old expo-router protected routes:
 *   no token  → auth group (Login/Signup)
 *   token + survey pending → survey only
 *   token + survey done → the app (Home + account-menu destinations)
 * Swapping the rendered screen set is React Navigation's documented auth pattern.
 */

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const surveyCompleted = useAuthStore((s) => s.surveyCompleted);
  const referralPromptPending = useAuthStore((s) => s.referralPromptPending);
  useRootNavigatorEffects(token, surveyCompleted);

  const appScreens = (
    <>
      {renderCoreScreens()}
      {renderDiscoveryScreens()}
    </>
  );

  /*
    Three post-token states, not two. The referral step comes FIRST because it
    is the last thing the signup itself owes the user — asked after the survey
    it would read as an unrelated interruption, and asked not at all it can
    never be asked again (Refer & Earn no longer takes a code).
  */
  let signedInScreens;
  if (referralPromptPending) {
    signedInScreens = <Stack.Screen name="ReferralPrompt" component={ReferralPromptScreen} />;
  } else if (surveyCompleted) {
    signedInScreens = appScreens;
  } else {
    signedInScreens = <Stack.Screen name="Survey" component={SurveyScreen} />;
  }

  return (
    <Stack.Navigator
      screenLayout={screenLayout}
      screenOptions={{
        headerShown: false,
        // Transitions disabled: animating a whole screen (with its full-bleed
        // backdrop) frame-by-frame janked navigation, so pushes/pops are instant.
        animation: 'none',
      }}
    >
      {token ? (
        signedInScreens
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
