import { Router } from 'express';
import busboy from 'busboy';
import { logs } from '@observability/log';
import { uploadToImagekit } from '@modules/platform/upload/upload.service';
import { spendUploadTicket } from '@modules/platform/upload/uploadTicket';

/**
 * The browser's upload route — files go to ImageKit through us.
 *
 * ImageKit's browser upload needs a signature the browser cannot make, so it is
 * handed a public key and a signed token instead. That only works while the two
 * keys are a matched pair, and when they are not, ImageKit answers every upload
 * with "invalid signature parameter" and nothing else. This route removes the
 * mechanism: the file comes here and the server uploads it with the private key
 * over Basic auth — the same way it already imports Pexels photos and release
 * builds.
 *
 * Multipart, because React Native streams a picked file that way and cannot
 * send a raw body from a URI. Web sends the same shape, so there is one path.
 */

/** Hard ceiling. The per-surface Upload Settings are the real gate. */
const MAX_BYTES = 200 * 1024 * 1024;

interface Picked {
  bytes: Buffer;
  fileName: string;
  tooLarge: boolean;
}

/** Read the one `file` part, or resolve with nothing if there isn't one. */
function readFilePart(req: Parameters<Parameters<Router['post']>[1]>[0]): Promise<Picked | null> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } });
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Malformed upload'));
      return;
    }

    let picked: Picked | null = null;
    parser.on('file', (_name, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      // busboy stops feeding at the limit rather than erroring, so the flag is
      // the only way to tell a truncated file from a complete one.
      stream.on('limit', () => {
        if (picked) picked.tooLarge = true;
      });
      stream.on('end', () => {
        picked = {
          bytes: Buffer.concat(chunks),
          fileName: info.filename || `upload-${Date.now()}`,
          tooLarge: picked?.tooLarge ?? false,
        };
      });
      picked = { bytes: Buffer.alloc(0), fileName: info.filename || '', tooLarge: false };
    });
    parser.on('error', (err: unknown) =>
      reject(err instanceof Error ? err : new Error('Malformed upload'))
    );
    parser.on('close', () => resolve(picked));
    req.pipe(parser);
  });
}

export function buildUploadRouter(): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const ticket = spendUploadTicket(String(req.query.ticket ?? ''));
    // Unknown, spent and expired get the same answer on purpose: telling them
    // apart tells someone guessing which half of the guess was right.
    if (!ticket) {
      res.status(401).json({ message: 'This upload link is no longer valid. Try again.' });
      return;
    }

    let picked: Picked | null;
    try {
      picked = await readFilePart(req);
    } catch (error: any) {
      res.status(400).json({ message: error?.message || 'Malformed upload' });
      return;
    }

    if (!picked || picked.bytes.length === 0) {
      res.status(400).json({ message: 'No file received' });
      return;
    }
    if (picked.tooLarge) {
      res.status(413).json({ message: 'That file is too large to upload' });
      return;
    }

    const fileName = String(req.query.fileName ?? '').trim() || picked.fileName;
    try {
      const uploaded = await uploadToImagekit({
        fileBytes: picked.bytes,
        fileName,
        // The folder comes from the ticket, not the request — otherwise anyone
        // holding a pass could write anywhere in the library.
        folder: ticket.folder,
      });
      res.json(uploaded);
    } catch (error: any) {
      logs.server.error('upload', 'proxy', {
        error,
        userId: ticket.userId,
        fileName,
        bytes: picked.bytes.length,
      });
      res.status(502).json({ message: error?.message || 'Upload failed' });
    }
  });

  return router;
}
