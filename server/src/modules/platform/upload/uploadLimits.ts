/**
 * The hard ceiling on one upload, in bytes.
 *
 * This is the SAME number as `client_max_body_size` on the `/upload` location
 * in deploy/nginx/duncit.com. nginx rejects a larger body before Node ever sees
 * it, so a server-side limit above it would be a promise the proxy breaks — and
 * one below it would reject bodies nginx was happy to pass. The two move
 * together or not at all.
 *
 * It lives here rather than inside the route because the calls that hand out an
 * upload pass have to tell the operator what will fit BEFORE they pick a file:
 * a 400 MB archive should be refused by the dialog, not discovered by a 413
 * after four minutes of uploading.
 */
export const UPLOAD_MAX_BYTES = 300 * 1024 * 1024;
