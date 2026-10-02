import type { SignatureMethod } from '../../graphql/documents';

/** The brief's ceiling, enforced here as well as on the server. */
export const MAX_BYTES = 5 * 1024 * 1024;
export const CANVAS_W = 520;
export const CANVAS_H = 160;

export const METHOD_LABEL: Record<SignatureMethod, string> = {
  DRAW: 'Draw',
  TYPE: 'Type',
  UPLOAD: 'Upload',
};
