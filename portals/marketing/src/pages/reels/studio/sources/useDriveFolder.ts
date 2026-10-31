import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { REEL_DRIVE_FOLDER } from '../../queries';
import type { ReelDriveEntry, ReelDriveFolder } from '../../types';

export interface DriveCrumb {
  id: string;
  name: string;
}

/**
 * The Drive folder a reel reads from, and the way down into its sub-folders.
 *
 * The reel's own folder is the root; `trail` is the path walked below it. A
 * shoot is usually a folder of folders — one per day or per camera — so the
 * browser has to descend, but it never climbs above the folder the reel was
 * given: that is the boundary of what the operator meant to share.
 */
export function useDriveFolder(rootFolderId: string) {
  const [trail, setTrail] = useState<DriveCrumb[]>([]);

  // A different root is a different shoot: the old path means nothing in it.
  useEffect(() => {
    setTrail([]);
  }, [rootFolderId]);

  const current = trail.at(-1)?.id ?? rootFolderId;
  const { data, loading, error, refetch } = useQuery<{ reelDriveFolder: ReelDriveFolder }>(REEL_DRIVE_FOLDER, {
    variables: { folder: current },
    skip: !current,
    fetchPolicy: 'cache-and-network',
  });

  const enter = useCallback((entry: ReelDriveEntry) => {
    setTrail((path) => [...path, { id: entry.id, name: entry.name }]);
  }, []);

  /** Go back to a step of the trail; -1 is the reel's own folder. */
  const goTo = useCallback((index: number) => {
    setTrail((path) => path.slice(0, index + 1));
  }, []);

  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  return { folder: data?.reelDriveFolder ?? null, loading, error, trail, enter, goTo, reload };
}
