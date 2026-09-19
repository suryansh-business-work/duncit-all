import { asc } from './appStoreConnect.gateway';
import { parseOperations, putOperation } from './ascBuildUpload.gateway';
import type { StoreAsset } from './storeAssets';

/**
 * Screenshots on an App Store version localization: one SET per display size,
 * holding the images in order. A set is brought in line with the listing by
 * comparing checksums — the MD5 Apple keeps for every screenshot is the one
 * `fetchStoreAsset` computes — so an unchanged set costs one GET, and a changed
 * one is replaced whole rather than diffed, which is the only way to also get
 * the order right.
 */

/** The two sets Apple requires of an iPhone app that supports iPad. */
export type ScreenshotDisplayType = 'APP_IPHONE_67' | 'APP_IPAD_PRO_3GEN_129';

interface ExistingShot {
  id: string;
  checksum: string;
}

async function findSet(
  token: string,
  localizationId: string,
  displayType: ScreenshotDisplayType
): Promise<{ id: string; shots: ExistingShot[] } | null> {
  const query = new URLSearchParams({
    include: 'appScreenshots',
    'fields[appScreenshots]': 'sourceFileChecksum,fileName',
    limit: '50',
  });
  const res = await asc.get(token, `/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?${query}`);
  const sets: any[] = Array.isArray(res.data) ? res.data : [];
  const set = sets.find((s) => s.attributes?.screenshotDisplayType === displayType);
  if (!set) return null;
  const included = new Map<string, any>(
    (Array.isArray(res.included) ? res.included : []).map((i: any) => [String(i.id), i])
  );
  const ids: string[] = (set.relationships?.appScreenshots?.data ?? []).map((d: any) => String(d.id));
  return {
    id: String(set.id),
    shots: ids.map((id) => ({ id, checksum: String(included.get(id)?.attributes?.sourceFileChecksum ?? '') })),
  };
}

async function createSet(token: string, localizationId: string, displayType: ScreenshotDisplayType): Promise<string> {
  const res = await asc.post(token, '/appScreenshotSets', {
    type: 'appScreenshotSets',
    attributes: { screenshotDisplayType: displayType },
    relationships: {
      appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: localizationId } },
    },
  });
  return String(res.data.id);
}

/** Reserve, PUT the parts, commit with the checksum. Same dance as the build, from memory. */
async function uploadScreenshot(token: string, setId: string, asset: StoreAsset): Promise<void> {
  const reserved = await asc.post(token, '/appScreenshots', {
    type: 'appScreenshots',
    attributes: { fileName: asset.fileName, fileSize: asset.bytes.length },
    relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
  });
  const id = String(reserved.data.id);
  for (const op of parseOperations(reserved.data.attributes?.uploadOperations)) {
    await putOperation(op, asset.bytes.subarray(op.offset, op.offset + op.length));
  }
  await asc.patch(token, `/appScreenshots/${id}`, {
    type: 'appScreenshots',
    id,
    attributes: { uploaded: true, sourceFileChecksum: asset.md5 },
  });
}

/** Make one display size's set hold exactly these images, in this order. Untouched when it already does. */
export async function syncScreenshotSet(
  token: string,
  localizationId: string,
  displayType: ScreenshotDisplayType,
  assets: StoreAsset[]
): Promise<void> {
  const existing = await findSet(token, localizationId, displayType);
  const same =
    existing !== null &&
    existing.shots.length === assets.length &&
    existing.shots.every((shot, i) => shot.checksum === assets[i]?.md5);
  if (same) return;
  const setId = existing?.id ?? (await createSet(token, localizationId, displayType));
  for (const shot of existing?.shots ?? []) {
    await asc.delete(token, `/appScreenshots/${shot.id}`);
  }
  for (const asset of assets) {
    await uploadScreenshot(token, setId, asset);
  }
}
