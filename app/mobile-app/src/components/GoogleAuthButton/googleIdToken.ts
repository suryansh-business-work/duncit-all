import { exchangeCodeAsync, type AuthRequest } from 'expo-auth-session';
import { discovery } from 'expo-auth-session/providers/google';

/**
 * The Google id_token from a successful prompt. On web Google hands it back
 * directly; the Android / iOS clients answer with a one-time code that is
 * exchanged here (PKCE — a native client has no secret).
 *
 * The library can exchange the code itself, but its exchange has no error
 * path: a failure is an unhandled rejection and the button would wait
 * forever. Done here, a failure rejects and the caller reports it.
 *
 * Resolves '' when the answer carries neither a token nor an exchangeable code.
 */
export async function readGoogleIdToken(
  result: { params: Record<string, string> },
  request: AuthRequest | null,
): Promise<string> {
  const direct = result.params.id_token;
  if (direct) return direct;
  const code = result.params.code;
  if (!code || !request?.codeVerifier) return '';
  const tokens = await exchangeCodeAsync(
    {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      code,
      extraParams: { code_verifier: request.codeVerifier },
    },
    discovery,
  );
  return tokens.idToken ?? '';
}
