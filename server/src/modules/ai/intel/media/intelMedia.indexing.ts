import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { documentKey, indexDocument, removeDocument } from '../index/intel.indexer';
import { intelOpenAiCredentials } from '../index/intel.openai';
import { IntelDocumentModel } from '../index/intelDocument.model';
import { collectionOf, qdrant } from '../index/qdrant.client';
import { intelSettingsService } from '../settings/intelSettings.service';
import { extractDocumentText } from './intelMedia.extract';
import { IntelMediaModel } from './intelMedia.model';
import { readFile } from './intelMedia.storage';

/**
 * Keeps the index in step with the Media Manager: a new or restored file is
 * extracted and indexed, a visibility change is applied to its chunks in
 * place, an archived or deleted file leaves the index at once.
 */

export const MEDIA_CONNECTOR = 'media';
export const mediaKey = (mediaId: string) => documentKey({ source: 'MEDIA', connector_id: MEDIA_CONNECTOR, external_id: mediaId });

export async function indexMedia(mediaId: string): Promise<void> {
  const file = await IntelMediaModel.findOneAndUpdate(
    { _id: mediaId, deleted_at: null, archived: false },
    { $set: { index_status: 'INDEXING', index_warning: '' } },
    { new: true }
  ).lean();
  if (!file) return;
  const settings = await intelSettingsService.get();
  try {
    const extracted = await extractDocumentText(await readFile(file.file_id), file.mime, {
      ocr: settings.media.ocr_images,
      visionModel: settings.media.vision_model,
      userId: String(file.owner_id),
      credentials: await intelOpenAiCredentials(settings),
    });
    const blocked = file.mime === 'application/pdf' && !settings.media.extract_pdf;
    if (blocked || extracted.pages.length === 0) {
      await IntelMediaModel.updateOne({ _id: file._id }, { $set: { index_status: 'SKIPPED', index_method: extracted.method, index_warning: blocked ? 'PDF text extraction is switched off in Settings › Media & Uploads.' : extracted.warning } });
      return;
    }
    const outcome = await indexDocument(
      {
        source: 'MEDIA',
        connector_id: MEDIA_CONNECTOR,
        external_id: String(file._id),
        scope: 'SHARED',
        title: file.name,
        url: `/media?file=${String(file._id)}`,
        pages: extracted.pages,
        owner_id: String(file.owner_id),
        visibility: file.visibility,
        metadata: { folder: file.folder, mime: file.mime },
        updated_at: file.updated_at,
      },
      settings
    );
    const doc = await IntelDocumentModel.findOne({ key: mediaKey(String(file._id)) }, { chunk_count: 1, error: 1 }).lean();
    await IntelMediaModel.updateOne(
      { _id: file._id },
      {
        $set: {
          index_status: outcome === 'FAILED' ? 'FAILED' : 'INDEXED',
          index_method: extracted.method,
          index_warning: outcome === 'FAILED' ? (doc?.error ?? 'Indexing failed') : extracted.warning,
          page_count: extracted.pages.length,
          chunk_count: doc?.chunk_count ?? 0,
          indexed_at: new Date(),
        },
      }
    );
  } catch (error) {
    logs.server.warn('intel', 'media.index', { error, mediaId });
    await IntelMediaModel.updateOne({ _id: file._id }, { $set: { index_status: 'FAILED', index_warning: error instanceof Error ? error.message.slice(0, 300) : 'Indexing failed' } });
  }
}

export async function unindexMedia(mediaId: string): Promise<void> {
  await removeDocument(mediaKey(mediaId));
  await IntelMediaModel.updateOne({ _id: new Types.ObjectId(mediaId) }, { $set: { index_status: 'PENDING', chunk_count: 0 } });
}

export async function updateMediaVisibility(mediaId: string, visibility: string): Promise<void> {
  const key = mediaKey(mediaId);
  await IntelDocumentModel.updateOne({ key }, { $set: { visibility } });
  await qdrant.setPayload(collectionOf('SHARED'), { visibility }, { must: [{ key: 'document_key', match: { value: key } }] }).catch((error) => logs.server.warn('intel', 'media.visibility', { error, mediaId }));
}
