export interface FileMeasure {
  width: number;
  height: number;
}

const NONE: FileMeasure = { width: 0, height: 0 };

/** Pictures and clips are measured; anything else the server measures itself, or not at all. */
export const kindOf = (file: Pick<File, 'type'>): 'image' | 'video' | 'other' => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'other';
};

/**
 * A picked file's natural size, read off a local object URL before it is
 * uploaded — the reel's footage list and the timeline's fit both want it, and
 * the upload itself answers with a URL only.
 *
 * A file the browser cannot decode measures 0 × 0 rather than failing the
 * upload: the server will still take the file, and the size is a nicety.
 */
export function measureFile(file: File): Promise<FileMeasure> {
  const kind = kindOf(file);
  if (kind === 'other') return Promise.resolve(NONE);
  const url = URL.createObjectURL(file);
  return new Promise<FileMeasure>((resolve) => {
    const done = (measure: FileMeasure) => {
      URL.revokeObjectURL(url);
      resolve(measure);
    };
    if (kind === 'image') {
      const image = new Image();
      image.onload = () => done({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => done(NONE);
      image.src = url;
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => done({ width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => done(NONE);
    video.src = url;
  });
}
