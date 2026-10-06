import { useEffect } from 'react';

/**
 * Makes a font renderable in the console so a picker can show it in itself.
 *
 * Google: a stylesheet asking only for the glyphs of `text` (Google's `text=`
 * parameter), so previewing forty families costs a few kilobytes, not forty
 * full font downloads. Uploaded: the file registered through the FontFace API.
 * Each link/face is added once per page and kept, so re-renders are free.
 */
const loaded = new Set<string>();

export function useGooglePreview(family: string, text: string) {
  useEffect(() => {
    const key = `g:${family}`;
    if (!family || loaded.has(key)) return;
    loaded.add(key);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(`${family}${text}`)}&display=swap`;
    document.head.append(link);
  }, [family, text]);
}

export function useUploadedPreview(family: string, files: { weight: number; style: string; url: string }[]) {
  useEffect(() => {
    for (const file of files) {
      const key = `c:${family}:${file.url}`;
      if (!family || !file.url || loaded.has(key)) continue;
      loaded.add(key);
      const face = new FontFace(family, `url("${file.url}")`, { weight: String(file.weight), style: file.style });
      face
        .load()
        .then((ready) => document.fonts.add(ready))
        .catch((error: unknown) => console.warn('[cms-fonts] preview could not load', { family, url: file.url, error }));
    }
  }, [family, files]);
}
