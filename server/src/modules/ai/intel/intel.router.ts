import { createHmac, timingSafeEqual } from 'node:crypto';
import busboy from 'busboy';
import express, { Router, type Request, type Response } from 'express';
import { Types } from 'mongoose';
import { resolveAuthUser } from '@context';
import { logs } from '@observability/log';
import { transcribe, isAcceptedAudio } from '@modules/ai/askDuncit/voice/askDuncit.voice';
import { actorFromUser, type IntelActor } from './access/intel.access';
import { writeAudit } from './audit/intelAudit.service';
import { resolveEntry } from './connectors/intel.credentials';
import { IntelConnectorModel } from './connectors/intelConnector.model';
import { INTEL_LIMITS, MEDIA_VISIBILITY, type MediaVisibility } from './intel.constants';
import { allowMinute } from './chat/intel.limits';
import { canViewFile, normalizeFolder } from './media/intelMedia.access';
import { sniffMime } from './media/intelMedia.extract';
import { IntelMediaModel } from './media/intelMedia.model';
import { toMediaDto } from './media/intelMedia.service';
import { putFile, sha256, streamFile } from './media/intelMedia.storage';
import { intelSettingsService } from './settings/intelSettings.service';
import { scheduleMediaIndex, scheduleSync } from './sync/intelSync.queue';

/**
 * Plain-HTTP routes for what GraphQL carries badly — binary bodies:
 *   POST /intel/media/upload           multipart (one file) → the stored file
 *   GET  /intel/media/:id/file         the bytes, if the caller may see the file
 *   POST /intel/transcribe             raw audio → { text }
 *   POST /intel/webhooks/github/:id    signed GitHub push → incremental sync
 * Authenticated with the same bearer token and role resolution as GraphQL.
 */

async function actorOf(req: Request, res: Response): Promise<IntelActor | null> {
  const actor = actorFromUser(await resolveAuthUser(req.get('authorization') ?? null));
  if (!actor) res.status(401).json({ error: 'UNAUTHENTICATED' });
  return actor;
}

function readUpload(req: Request, maxBytes: number): Promise<{ name: string; mime: string; data: Buffer; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    let parser: ReturnType<typeof busboy>;
    try {
      parser = busboy({ headers: req.headers, limits: { files: 1, fileSize: maxBytes } });
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Invalid upload'));
      return;
    }
    let found = false;
    parser.on('file', (_field, stream, info) => {
      found = true;
      const chunks: Buffer[] = [];
      let truncated = false;
      stream.on('limit', () => {
        truncated = true;
      });
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve({ name: info.filename || 'file', mime: info.mimeType || 'application/octet-stream', data: Buffer.concat(chunks), truncated }));
    });
    parser.on('error', reject);
    parser.on('close', () => {
      if (!found) reject(new Error('No file in the upload'));
    });
    req.pipe(parser);
  });
}

async function upload(req: Request, res: Response) {
  const actor = await actorOf(req, res);
  if (!actor) return;
  if (!allowMinute(`upload:${actor.user.id}`, 30)) return res.status(429).json({ error: 'Too many uploads. Wait a minute.' });
  const settings = await intelSettingsService.get();
  const maxBytes = Math.min(settings.media.max_file_mb * 1024 * 1024, INTEL_LIMITS.maxUploadBytes);
  try {
    const file = await readUpload(req, maxBytes);
    if (file.truncated) return res.status(413).json({ error: `Files can be at most ${settings.media.max_file_mb} MB.` });
    const mime = sniffMime(file.data, file.mime);
    if (!mime || !settings.media.allowed_types.includes(mime)) return res.status(415).json({ error: 'This file type is not allowed. Upload a PDF, PNG, JPG, WEBP or text file.' });
    const visibility = (MEDIA_VISIBILITY as readonly string[]).includes(String(req.query.visibility)) ? (String(req.query.visibility) as MediaVisibility) : settings.media.default_visibility;
    const name = file.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 200);
    const fileId = await putFile(file.data, name, mime);
    const doc = await IntelMediaModel.create({ owner_id: new Types.ObjectId(actor.user.id), name, folder: normalizeFolder(String(req.query.folder ?? '/')), mime, size: file.data.length, file_id: fileId, sha256: sha256(file.data), visibility, index_status: settings.media.auto_index ? 'PENDING' : 'SKIPPED' });
    if (settings.media.auto_index) scheduleMediaIndex(String(doc._id));
    await writeAudit({ type: 'MEDIA', action: 'media.upload', userId: actor.user.id, level: actor.level, target: `${name} (${String(doc._id)})`, detail: `${mime} · ${file.data.length} bytes · ${visibility}` });
    return res.status(201).json(toMediaDto(doc.toObject()));
  } catch (error) {
    logs.server.warn('intel', 'upload', { error });
    return res.status(400).json({ error: error instanceof Error ? error.message : 'The upload failed' });
  }
}

async function download(req: Request, res: Response) {
  const actor = await actorOf(req, res);
  if (!actor) return;
  const id = String(req.params.id);
  const file = Types.ObjectId.isValid(id) ? await IntelMediaModel.findById(id).lean() : null;
  if (!file || !canViewFile(actor, file)) return res.status(404).json({ error: 'NOT_FOUND' });
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Length', String(file.size));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  streamFile(file.file_id)
    .on('error', (error) => {
      logs.server.warn('intel', 'download', { error, id });
      if (res.headersSent) res.end();
      else res.status(500).end();
    })
    .pipe(res);
}

async function voice(req: Request, res: Response) {
  const actor = await actorOf(req, res);
  if (!actor) return;
  const mime = req.get('content-type') ?? '';
  if (!isAcceptedAudio(mime) || !Buffer.isBuffer(req.body)) return res.status(415).json({ error: 'UNSUPPORTED_AUDIO' });
  if (!allowMinute(`voice:${actor.user.id}`, 12)) return res.status(429).json({ error: 'RATE_LIMITED' });
  const out = await transcribe(req.body, mime, { model: 'whisper-1', userId: actor.user.id, task: 'intel.transcribe' });
  return out.ok ? res.json({ text: out.value }) : res.status(out.code === 'TOO_LARGE' ? 413 : 422).json({ error: out.code, message: out.message });
}

export function validSignature(secret: string, body: Buffer, header: string): boolean {
  if (!secret || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

async function githubHook(req: Request, res: Response) {
  const id = String(req.params.id);
  const connector = Types.ObjectId.isValid(id) ? await IntelConnectorModel.findOne({ _id: id, kind: 'GITHUB' }).lean() : null;
  const entry = connector ? await resolveEntry('GITHUB', connector.env_entry_id) : null;
  if (!connector || !entry || !Buffer.isBuffer(req.body) || !validSignature(entry.config.webhook_secret ?? '', req.body, req.get('x-hub-signature-256') ?? '')) {
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
  }
  if (req.get('x-github-event') === 'push' && connector.enabled && !connector.sync_paused) await scheduleSync(connector, 'INCREMENTAL', 'WEBHOOK');
  return res.status(202).json({ ok: true });
}

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response) => {
  fn(req, res).catch((error) => {
    logs.server.error('intel', 'route', { error, path: req.path });
    if (!res.headersSent) res.status(500).json({ error: 'INTERNAL' });
  });
};

export function buildIntelRouter(): Router {
  const router = Router();
  router.post('/media/upload', wrap(upload));
  router.get('/media/:id/file', wrap(download));
  router.post('/transcribe', express.raw({ type: 'audio/*', limit: INTEL_LIMITS.maxAudioBytes }), wrap(voice));
  router.post('/webhooks/github/:id', express.raw({ type: 'application/json', limit: '5mb' }), wrap(githubHook));
  return router;
}
