import type { NestedCatalogue } from '../catalogue';

/**
 * The media picker's copy — a namespace of its own, not a surface's.
 *
 * @duncit/media-picker renders in the PORTALS (via the shell) and in mWeb, so
 * its strings belong to neither bundle: putting them in both would be two
 * hand-kept copies of the same sentences, which is exactly the drift rule 27
 * exists to stop. One namespace, shipped by whichever build imports the
 * package — the copy is compiled into each all the same.
 *
 * The native app does not use this package, which is why there is no third
 * consumer to keep in step.
 */
export const MEDIA_BUNDLE: NestedCatalogue = {
  media: {
    picker: {
      title: 'Select an image',
      fromDevice: 'Upload from device',
      pexelsPhotos: 'Pexels photos',
      pexelsVideos: 'Pexels videos',
      uploading: 'Uploading…',
      uploadToImagekit: 'Upload to ImageKit',
      useThis: 'Use this image',
      remove: 'Remove',
      removeImage: 'Remove image',
      removeAttachment: 'Remove attachment',
      noImage: 'No image',
      open: 'Open',
      urlPlaceholder: 'Click the icon to upload, or paste a URL…',
      attachFiles: 'Attach files',
      add: 'Add',
      uploadFailed: 'Upload failed',
    },
    crop: {
      title: 'Crop',
      suggested: 'Suggested',
      zoom: 'Crop zoom',
    },
    pexels: {
      credit: 'Pexels',
      importing: 'Importing…',
      searchPhotos: 'Search Pexels (e.g. coffee, sunset, basketball)…',
      searchVideos: 'Search Pexels videos…',
      noPhotos: 'No results — try a different query.',
      noVideos: 'No videos — try a different query.',
      landscape: 'Landscape',
      portrait: 'Portrait',
      square: 'Square',
    },
    device: {
      choosePdf: 'Click to choose a PDF',
      chooseVideo: 'Click to choose a video',
      chooseImage: 'Click to choose an image',
      hintPdf: 'PDF only · max 50 MB · uploads to ImageKit',
      hintVideo: 'MP4, MOV or WebM · max {mb} MB · uploads to ImageKit',
      hintImage: 'PNG, JPG, WebP, GIF · max {mb} MB · uploads to ImageKit',
      change: 'Change',
      uploading: 'Uploading',
      compressing: 'Compressing',
      croppingAndCompressing: 'Cropping & compressing',
    },
  },
};
