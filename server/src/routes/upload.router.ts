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
import { mediaScanService } from '@modules/ai/aiMonitoring/aiMonitoring.service';
import {
  artifactUrl,
  ensureArtifactsDir,
  newArtifactDestination,
} from '@modules/platform/upload/buildArtifactStore';
import { UPLOAD_MAX_BYTES } from '@modules/platform/upload/uploadLimits';
import { backupPath, ensureBackupsDir } from '@modules/platform/dbBackup/dbBackup.store';

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

/** Hard ceiling, shared with nginx. Per-surface Upload Settings gate the rest. */
const MAX_BYTES = UPLOAD_MAX_BYTES;

/** Extensions AI Monitoring reviews. The multipart body carries no reliable
 * mime type, so the name is what there is to go on. */
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;

const isImageUpload = (fileName: string) => IMAGE_EXT_RE.test(fileName);

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

    // A build artifact is spooled STRAIGHT into the directory it will be served
    // from, so a 100 MB APK is written once. Spooling to tmp and moving would
    // write it twice — and worse, the move would be a cross-device copy: in the
    // container /tmp and the bind-mounted artifacts dir are different mounts, so
    // fs.rename fails there with EXDEV.
    // A database archive lands the same way and for the same reason, except
    // that its name was decided when the pass was issued: the backup row
    // already exists and already points at it. Resolving through backupPath
    // means a tampered destination cannot write outside the directory.
    const toBuilds = ticket.store === 'builds';
    const toBackups = ticket.store === 'db-backups';
    let storedName = '';
    let destPath = path.join(os.tmpdir(), `duncit-upload-${crypto.randomUUID()}`);
    if (toBuilds) {
      await ensureArtifactsDir();
      const dest = newArtifactDestination(String(req.query.fileName ?? '').trim() || 'artifact');
      storedName = dest.name;
      destPath = dest.path;
    } else if (toBackups) {
      const resolved = backupPath(ticket.destination);
      if (!resolved) {
        res.status(400).json({ message: 'That upload link does not name a backup archive.' });
        return;
      }
      await ensureBackupsDir();
      storedName = ticket.destination;
      destPath = resolved;
    }

    let keep = false;
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
        if (toBuilds) {
          // Already in place. fileId is the on-disk name, which is the handle
          // deleteAppBuild removes it by.
          keep = true;
          res.json({ url: await artifactUrl(storedName), fileId: storedName });
          return;
        }
        if (toBackups) {
          // In place too, but nothing here reads it: an archive is only a
          // backup once it has been read end to end, which the mutation the
          // caller sends next starts. Until then the row stays RUNNING.
          keep = true;
          res.json({ fileName: storedName });
          return;
        }
        const uploaded = await uploadFileToImagekit({
          filePath: destPath,
          fileName,
          // The folder comes from the ticket, not the request — otherwise anyone
          // holding a pass could write anywhere in the library.
          folder: ticket.folder,
        });
        // Images that come through here (support attachments, native picks)
        // never touched the GraphQL upload path, so this is the only place they
        // can be logged. Without it "every upload is checked" would be true of
        // one of the two routes a file can take. Videos are not AI-reviewed.
        if (isImageUpload(fileName)) {
          mediaScanService
            .record({
              url: uploaded.url,
              fileName,
              folder: ticket.folder,
              surface: ticket.surface,
              userId: ticket.userId,
            })
            .catch(() => undefined);
        }
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
      // Always, except the one path that means to keep it — an artifact left in
      // the container's tmpdir on every build fills the disk silently, and a
      // half-written one left in the served directory is a broken download.
      if (!keep) await fs.promises.unlink(destPath).catch(() => undefined);
    }
  });

  return router;
}
