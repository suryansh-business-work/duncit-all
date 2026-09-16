import { logs } from '@observability/log';
import { mediaLibraryService } from '@modules/platform/upload/mediaLibrary.service';
import { PodModel } from './pod.model';

/** Probes already on their way, so a feed of pods sharing one reel — or two
 * viewers opening Explore together — asks ImageKit once. */
const inFlight = new Map<string, Promise<boolean | null>>();

async function probe(url: string): Promise<boolean | null> {
  try {
    const hasAudio = await mediaLibraryService.hasAudio(url);
    // Every pod on this reel (an Auto Pod's pods share one) keeps the answer.
    await PodModel.updateMany({ reel_url: url }, { $set: { reel_audio: { url, has_audio: hasAudio } } });
    return hasAudio;
  } catch (err) {
    logs.server.warn('pod', 'reelAudioProbe', { url, error: (err as Error).message });
    return null;
  }
}

/**
 * Whether a pod's reel has sound, for the Explore mute control. Stored per reel
 * url, so the ImageKit metadata call happens once per upload — on the first
 * read after it — rather than on every feed load. Null when there is no reel or
 * the probe could not answer; the client then leaves the control enabled.
 */
export async function reelHasAudio(parent: any): Promise<boolean | null> {
  const url: string | null = parent?.reel_url ?? null;
  if (!url) return null;
  if (parent.reel_audio?.url === url) return !!parent.reel_audio.has_audio;
  const pending = inFlight.get(url) ?? probe(url);
  inFlight.set(url, pending);
  try {
    return await pending;
  } finally {
    inFlight.delete(url);
  }
}
