import { useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { readTruecallerSignupProof, type TruecallerSignupProof } from '@duncit/utils';

import type { RootStackParamList } from '@/navigation/types';

/**
 * Take the Truecaller proof that navigated here (from login, or from this
 * screen's own Truecaller button) into the signup flow — once. The param is
 * cleared as it is taken: the proof is single-use on the server, so a replay
 * would only prefill a form whose shortcut no longer works.
 * mWeb twin: app/mweb/src/pages/register-page/useTruecallerHandoff.ts.
 */
export function useTruecallerHandoff(onProof: (proof: TruecallerSignupProof) => void) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Signup'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Signup'>>();
  const carried = readTruecallerSignupProof(route.params?.truecallerSignup);
  const token = carried?.whatsapp_token ?? '';

  useEffect(() => {
    if (!carried) return;
    onProof(carried);
    navigation.setParams({ truecallerSignup: undefined });
    // Keyed by the proof itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}
