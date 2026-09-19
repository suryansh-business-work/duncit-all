import busboy from 'busboy';
import { Router } from 'express';
import { decodeAuthUser } from '../context';
import { LiteUserModel } from '../models/user.model';
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB, isImageMime, uploadImage } from '../services/upload.service';
import { log } from '../utils/log';

interface Received {
  fileName: string;
  mime: string;
  bytes: Buffer;
  tooLarge: boolean;
}

/** Read the one `file` part into memory (covers and avatars are small). */
function receive(req: Parameters<Router['post']>[1] extends (...args: infer A) => unknown ? A[0] : never): Promise<Received | null> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: UPLOAD_MAX_BYTES } });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Malformed upload'));
      return;
    }
    let received: Received | null = null;
    parser.on('file', (_name, stream, info) => {
      const chunks: Buffer[] = [];
      const entry: Received = { fileName: info.filename || `upload-${Date.now()}`, mime: info.mimeType || '', bytes: Buffer.alloc(0), tooLarge: false };
      received = entry;
      stream.on('limit', () => {
        entry.tooLarge = true;
      });
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        entry.bytes = Buffer.concat(chunks);
      });
    });
    parser.on('error', reject);
    parser.on('finish', () => resolve(received));
    req.pipe(parser);
  });
}

/** POST /upload — multipart `file`, Bearer token; answers `{ url }`. */
export function buildUploadRouter(): Router {
  const router = Router();
  router.post('/upload', async (req, res) => {
    const auth = decodeAuthUser(req.headers.authorization);
    const user = auth ? await LiteUserModel.findById(auth.id).lean() : null;
    if (!user || user.is_blocked) {
      res.status(401).json({ error: 'Sign in to upload' });
      return;
    }
    try {
      const file = await receive(req);
      if (!file) {
        res.status(400).json({ error: 'No file was sent' });
        return;
      }
      if (file.tooLarge) {
        res.status(413).json({ error: `Pictures must be ${UPLOAD_MAX_MB} MB or smaller` });
        return;
      }
      if (!isImageMime(file.mime)) {
        res.status(415).json({ error: 'Only JPEG, PNG, WebP, GIF or AVIF pictures' });
        return;
      }
      const result = await uploadImage(file.bytes, file.fileName);
      res.json({ url: result.url, file_id: result.fileId });
    } catch (error) {
      log.error('upload', 'post', { error, user: String(user._id) });
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(500).json({ error: message });
    }
  });
  return router;
}
