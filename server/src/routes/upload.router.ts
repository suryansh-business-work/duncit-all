import { Router } from 'express';
import busboy from 'busboy';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { logs } from '@observability/log';
import { uploadFileToImagekit } from '@modules/platform/upload/upload.service';
import { spendUploadTicket } from '@modules/platform/upload/uploadTicket';

/**
 * The one route that accepts a file — browser, native app and CI all use it.
 *
 * ImageKit's client upload needs a signature the caller cannot make, so it is
 * handed a public key and a signed token instead. That only works while the two
 * keys are a matched pair, and when they are not, ImageKit answers every upload
 * with "invalid signature parameter" and nothing else. This route removes the
 * mechanism: the file comes here and the server uploads it with the private key
 * over Basic auth — the same way it already imports Pexels photos.
 *
 * Multipart, because React Native streams a picked file that way and cannot
 * send a raw body from a URI. Web and CI send the same shape, so there is one
 * path.
 *
 * The body is spooled to a temp file rather than held in memory. A CI build
 * artifact is 60–150 MB; buffering one would cost that much resident memory on
 * the API server — twice, while concatenating chunks — and a couple of
 * concurrent uploads could then push a live process into swap. On disk, peak
 * memory is flat no matter how big the file is.
 */

/** Hard ceiling. Sized for a build artifact; per-surface Upload Settings gate the rest. */
const MAX_BYTES = 300 * 1024 * 1024;

interface Spooled {
  fileName: string;
  bytes: number;
  tooLarge: boolean;
}

/**
 * Write the one `file` part to `destPath`, or resolve with nothing if the
 * request carries no file. The caller owns `destPath` so it can always be
 * cleaned up, including when this rejects part-way through.
 */
function spoolFilePart(
  req: Parameters<Parameters<Router['post']>[1]>[0],
  destPath: string
): Promise<Spooled | null> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } });
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Malformed upload'));
      return;
    }

    let spooled: Spooled | null = null;
    let writing: Promise<void> | null = null;

    parser.on('file', (_name, stream, info) => {
      const entry: Spooled = {
        fileName: info.filename || `upload-${Date.now()}`,
        bytes: 0,
        tooLarge: false,
      };
      spooled = entry;
      // busboy stops feeding at the limit rather than erroring, so the flag is
      // the only way to tell a truncated file from a complete one.
      stream.on('limit', () => {
        entry.tooLarge = true;
      });
      writing = pipeline(stream, fs.createWriteStream(destPath));
    });

    parser.on('error', (err: unknown) =>
      reject(err instanceof Error ? err : new Error('Malformed upload'))
    );
    parser.on('close', () => {
      // busboy closes when the parts are parsed, which is before the write
      // stream has flushed — the file is only whole once the pipeline settles.
      if (!writing || !spooled) {
        resolve(null);
        return;
      }
      const entry = spooled;
      writing
        .then(() => {
          entry.bytes = fs.statSync(destPath).size;
          resolve(entry);
        })
        .catch(reject);
    });
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

    const destPath = path.join(os.tmpdir(), `duncit-upload-${crypto.randomUUID()}`);
    try {
      let spooled: Spooled | null;
      try {
        spooled = await spoolFilePart(req, destPath);
      } catch (error: any) {
        res.status(400).json({ message: error?.message || 'Malformed upload' });
        return;
      }

      if (!spooled || spooled.bytes === 0) {
        res.status(400).json({ message: 'No file received' });
        return;
      }
      if (spooled.tooLarge) {
        res.status(413).json({ message: 'That file is too large to upload' });
        return;
      }

      const fileName = String(req.query.fileName ?? '').trim() || spooled.fileName;
      try {
        const uploaded = await uploadFileToImagekit({
          filePath: destPath,
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
          bytes: spooled.bytes,
        });
        res.status(502).json({ message: error?.message || 'Upload failed' });
      }
    } finally {
      // Always, including the paths that never created it — an artifact left in
      // the container's tmpdir on every build fills the disk silently.
      await fs.promises.unlink(destPath).catch(() => undefined);
    }
  });

  return router;
}
