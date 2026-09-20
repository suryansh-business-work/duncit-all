import { API, auth, call, discardEdit, openEdit, playAccessToken, type PlayConfig } from './googlePlay.gateway';
import { playStatus, type StoreReleaseRow } from './storeRelease.rows';

/**
 * Every release on every Google Play track, live from the Play Developer API.
 *
 * Tracks are read inside an edit — the API has no other door to them — and
 * the edit is thrown away afterwards, so nothing is changed. What the API
 * says is what the table shows: which version codes each track carries, and
 * whether the release is a draft, rolling out, halted or complete. It says
 * NOTHING about Play's review: a policy rejection is only in the Play Console
 * and its mail, which is why a Play rejection is logged by hand.
 */

const PLAY_CONSOLE = 'https://play.google.com/console/';

export interface PlayReleases {
  packageName: string;
  url: string;
  rows: StoreReleaseRow[];
}

interface PlayTrackRelease {
  name?: string;
  versionCodes?: string[];
  status?: string;
  userFraction?: number;
}

interface PlayTrackRecord {
  track?: string;
  releases?: PlayTrackRelease[];
}

function rowsOfTrack(track: PlayTrackRecord): StoreReleaseRow[] {
  const name = String(track.track ?? '');
  return (track.releases ?? []).map((release) => {
    const codes = (release.versionCodes ?? []).map(String);
    const status = String(release.status ?? '');
    const fraction = typeof release.userFraction === 'number' ? release.userFraction : null;
    return {
      id: `GOOGLE_PLAY:${name}:${codes.join('+')}`,
      store: 'GOOGLE_PLAY',
      version: String(release.name ?? ''),
      build_number: codes.join(', '),
      state: `${name}/${status}`,
      status: playStatus(name, status),
      track: name,
      review_state: '',
      created_at: null,
      submitted_at: null,
      rollout_pct: fraction === null ? null : Math.round(fraction * 100),
      store_ref: String(release.name ?? codes.join('+')),
    };
  });
}

/** Every track's releases, production first. Throws with Google's words when the account cannot read the app. */
export async function listPlayReleases(cfg: PlayConfig): Promise<PlayReleases> {
  const token = await playAccessToken(cfg.account);
  const editId = await openEdit(token, cfg.packageName);
  try {
    const data = await call(`${API}/${cfg.packageName}/edits/${editId}/tracks`, { headers: auth(token) });
    const tracks: PlayTrackRecord[] = Array.isArray(data.tracks) ? data.tracks : [];
    tracks.sort((a, b) => Number(b.track === 'production') - Number(a.track === 'production'));
    return { packageName: cfg.packageName, url: PLAY_CONSOLE, rows: tracks.flatMap(rowsOfTrack) };
  } finally {
    await discardEdit(token, cfg.packageName, editId);
  }
}
