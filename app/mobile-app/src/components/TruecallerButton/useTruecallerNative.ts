import { useEffect, useMemo, useRef } from 'react';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import type { TruecallerIds, TruecallerProofInput } from '@/services/truecaller.service';

type TruecallerSdk = typeof import('@ajitpatel28/react-native-truecaller');

/**
 * Loaded only once a button that needs it renders — a build without
 * Truecaller linked (and the test runner) never evaluates the SDK.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native-only module
const sdk = (): TruecallerSdk => require('@ajitpatel28/react-native-truecaller');

/**
 * Whether THIS binary carries Truecaller: the build recorded it set the SDK up
 * (plugins/withTruecaller) and the native module is really linked. An app
 * built before Truecaller was configured has neither, and shows no button.
 */
export function isTruecallerLinked(): boolean {
  const built = (Constants.expoConfig?.extra?.truecaller ?? {}) as Partial<Record<string, boolean>>;
  if (Platform.OS === 'android') return built.android === true && !!NativeModules.TruecallerModule;
  if (Platform.OS === 'ios') return built.ios === true && !!NativeModules.ReactNativeTruecaller;
  return false;
}

interface Handlers {
  onProof: (proof: TruecallerProofInput) => void;
  /** The SDK reported a failure — a cancel included; it cannot tell them apart. */
  onFailure: (detail: string) => void;
}

/**
 * Truecaller's SDK, driven for Duncit: initialised once with the identifiers
 * from Tech, and every success handed on RAW — the Android OAuth code + PKCE
 * verifier, or iOS's signed payload — for the server to check. The SDK's own
 * profile fetch is never used: what a phone says about itself proves nothing.
 */
export function useTruecallerNative(ids: TruecallerIds, handlers: Handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  const config = useMemo(
    () => ({
      androidClientId: ids.androidClientId,
      iosAppKey: ids.iosAppKey,
      iosAppLink: ids.iosAppLink,
      androidSuccessHandler: (data: { authorizationCode: string; codeVerifier: string }) =>
        latest.current.onProof({
          platform: 'ANDROID',
          authorizationCode: data.authorizationCode,
          codeVerifier: data.codeVerifier,
        }),
      iosSuccessHandler: (data: {
        payload?: string | null;
        signature?: string | null;
        signatureAlgorithm?: string | null;
      }) => {
        if (data.payload && data.signature && data.signatureAlgorithm) {
          latest.current.onProof({
            platform: 'IOS',
            payload: data.payload,
            signature: data.signature,
            signatureAlgorithm: data.signatureAlgorithm,
          });
        } else {
          latest.current.onFailure('iOS profile arrived without a signature');
        }
      },
    }),
    [ids.androidClientId, ids.iosAppKey, ids.iosAppLink],
  );

  const truecaller = sdk().useTruecaller(config);
  const { initializeTruecallerSDK, error } = truecaller;

  useEffect(() => {
    initializeTruecallerSDK().catch((e: unknown) => latest.current.onFailure(String(e)));
  }, [initializeTruecallerSDK]);

  useEffect(() => {
    if (error) latest.current.onFailure(error);
  }, [error]);

  /** Opens Truecaller's consent sheet; false when this phone cannot show it. */
  const open = async (): Promise<boolean> => {
    if (!truecaller.isTruecallerInitialized || !(await truecaller.isSdkUsable())) return false;
    await truecaller.openTruecallerForVerification();
    return true;
  };

  return { ready: truecaller.isTruecallerInitialized, open };
}
