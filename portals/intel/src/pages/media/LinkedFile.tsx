import { useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client/react';
import { INTEL_MEDIA_FILE, type IntelMedia, type MediaFileData } from '../../graphql/media';

/** A file opened by link (a chat citation's /media?file=<id>): loads it and hands it to the dialog once. */
export default function LinkedFile({ id, onOpen }: Readonly<{ id: string; onOpen: (file: IntelMedia) => void }>) {
  const { data } = useQuery<MediaFileData>(INTEL_MEDIA_FILE, { variables: { id } });
  const opened = useRef(false);
  useEffect(() => {
    if (data && !opened.current) {
      opened.current = true;
      onOpen(data.intelMediaFile);
    }
  }, [data, onOpen]);
  return null;
}
