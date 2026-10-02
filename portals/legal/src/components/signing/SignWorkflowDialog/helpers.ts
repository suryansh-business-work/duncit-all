/** Step labels are copy, so the list is built from the active catalogue. */
export const STEP_KEYS = ['legal.sign.stepPreview', 'legal.sign.stepSignature', 'legal.sign.stepDone'];

/** Turn the base64 the server sends into something the browser can show and save. */
export const toPdfUrl = (base64: string) => `data:application/pdf;base64,${base64}`;

/** A file name the OS will accept, built from whatever the record is called. */
export const fileNameFor = (title: string, signed: boolean) =>
  `${title.replaceAll(/[^\w.-]+/g, '-')}${signed ? '-signed' : ''}.pdf`;
