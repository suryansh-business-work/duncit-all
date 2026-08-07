import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { threadKey } from './staffChat.model';

/**
 * Joining a LiveKit room, signed here.
 *
 * A LiveKit access token is an ordinary JWT with a `video` grant claim, so it
 * is minted with the `jsonwebtoken` this server already has rather than pulling
 * in `livekit-server-sdk` for one signature. The API SECRET never leaves the
 * server — that is the entire reason this endpoint exists instead of the
 * browser talking to LiveKit directly.
 *
 * The room is derived from the pair of people, not chosen by the caller: two
 * colleagues always land in the same room, and nobody can ask for a token to
 * somebody else's.
 */

export interface LiveKitGrant {
  /** Where the client connects. */
  url: string;
  token: string;
  room: string;
  /** Seconds the token is good for, so a client can refresh before it lapses. */
  expiresIn: number;
}

const TTL_SECONDS = 60 * 60 * 4;

/** LiveKit rooms are opaque strings; the thread key already identifies a pair. */
const roomFor = (meId: string, peerId: string) => `staff-${threadKey(meId, peerId)}`;

export async function liveKitGrant(
  meId: string,
  meName: string,
  peerId: string
): Promise<LiveKitGrant> {
  const [url, apiKey, apiSecret] = await Promise.all([
    getRuntimeEnvValue('LIVEKIT_URL'),
    getRuntimeEnvValue('LIVEKIT_API_KEY'),
    getRuntimeEnvValue('LIVEKIT_API_SECRET'),
  ]);

  if (!url || !apiKey || !apiSecret) {
    // Named rather than generic: whoever sees this needs to know it is a
    // Tech-portal setting and not a bug in the call.
    throw new GraphQLError(
      'Screen sharing is not configured — add the LiveKit credentials in Tech → Environment Variables.',
      { extensions: { code: 'CONFIG_ERROR' } }
    );
  }

  const room = roomFor(meId, peerId);
  const now = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      // LiveKit reads the identity from `sub`, and shows `name` to the room.
      sub: meId,
      name: meName,
      nbf: now,
      exp: now + TTL_SECONDS,
      video: {
        room,
        roomJoin: true,
        // No roomCreate: the room comes into being on first join and nobody
        // needs the right to conjure arbitrary ones.
        canPublish: true,
        canSubscribe: true,
        // The data channel is what carries the cursor, the drawing and the
        // control handover — the whole remote-control protocol rides on it.
        canPublishData: true,
      },
    },
    apiSecret,
    { issuer: apiKey, algorithm: 'HS256' }
  );

  return { url, token, room, expiresIn: TTL_SECONDS };
}
