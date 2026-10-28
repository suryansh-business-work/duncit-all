/**
 * Lite's picture picker, shared by the web app and the console: a field that
 * shows the current picture and opens a "Choose a picture" dialog with a
 * drag-and-drop upload (sent to ImageKit by the API) and Pexels stock photos
 * by featured pick, topic or search (copied to ImageKit when chosen).
 *
 * The API side is `litePictureOptions`, `litePexelsSearch`,
 * `liteImportPexelsPhoto` and POST /upload; the Pexels key lives under
 * Console → Environment → Pexels and the topics under Console → Settings.
 *
 * `PictureDialog` alone is for a page that draws its own picture and trigger
 * (the calendar form's cover and avatar).
 */
export { PictureDialog } from './PictureDialog';
export { PictureField, type PictureFieldProps } from './PictureField';
export type { PictureShape } from './picture.types';
