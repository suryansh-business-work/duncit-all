import { useEffect, useState } from 'react';

/** A device as it was saved: the id this origin issued, and what it is called. */
export interface SavedDevice {
  id: string;
  label: string;
}

/**
 * Which device HERE is the saved choice — '' meaning "whatever the OS prefers".
 *
 * A deviceId is salted per ORIGIN. The same microphone is a different id in
 * admin.duncit.com and in finance.duncit.com, and the panel that saves it is
 * shared by all seventeen consoles — so a saved id is right in exactly one of
 * them and names nothing in the rest. The label does not move: a browser that
 * will name a device at all names it the same everywhere.
 *
 * So: the id when this browser still has it, otherwise the device wearing the
 * same name, otherwise the default. A list with no ids at all is not a machine
 * without microphones — it is one that has never granted a permission on this
 * origin, and there the saved id is still the best thing to try.
 */
export function matchDevice(list: readonly MediaDeviceInfo[], saved: SavedDevice): string {
  if (!saved.id && !saved.label) return '';
  if (list.every((device) => device.deviceId === '')) return saved.id;
  if (list.some((device) => device.deviceId === saved.id)) return saved.id;
  const byName = saved.label ? list.find((device) => device.label === saved.label) : undefined;
  return byName?.deviceId ?? '';
}

/** What a device is called here, so the name can be saved beside its id. */
export const labelOf = (list: readonly MediaDeviceInfo[], deviceId: string): string =>
  list.find((device) => device.deviceId === deviceId)?.label ?? '';

export interface ResolvedDevices {
  mics: MediaDeviceInfo[];
  cams: MediaDeviceInfo[];
  /** The saved choice, as ids this browser will actually accept. */
  micId: string;
  camId: string;
}

/** Split one enumerateDevices() answer into the two lists the pickers show. */
const splitDevices = (all: MediaDeviceInfo[]) => ({
  mics: all.filter((device) => device.kind === 'audioinput'),
  cams: all.filter((device) => device.kind === 'videoinput'),
});

/**
 * The saved microphone and camera, translated into this browser's ids.
 *
 * Kept live rather than read once per call: `devicechange` fires when a headset
 * is plugged in or pulled out, and the choice somebody made last week should
 * start being honoured the moment the device it names is back — not on the next
 * page load.
 */
export function useResolvedDevices(
  micId: string,
  micLabel: string,
  camId: string,
  camLabel: string
): ResolvedDevices {
  const [lists, setLists] = useState<{ mics: MediaDeviceInfo[]; cams: MediaDeviceInfo[] }>({
    mics: [],
    cams: [],
  });

  useEffect(() => {
    const media = globalThis.navigator?.mediaDevices;
    if (!media?.enumerateDevices) return undefined;
    let live = true;
    const read = () => {
      media
        .enumerateDevices()
        .then((all) => {
          if (!live) return;
          setLists(splitDevices(all));
        })
        .catch(() => undefined);
    };
    read();
    media.addEventListener?.('devicechange', read);
    return () => {
      live = false;
      media.removeEventListener?.('devicechange', read);
    };
  }, []);

  return {
    mics: lists.mics,
    cams: lists.cams,
    micId: matchDevice(lists.mics, { id: micId, label: micLabel }),
    camId: matchDevice(lists.cams, { id: camId, label: camLabel }),
  };
}
