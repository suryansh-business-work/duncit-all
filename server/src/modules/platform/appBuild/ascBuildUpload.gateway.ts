import fs from 'node:fs';
import { asc } from './appStoreConnect.gateway';

/**
 * Uploading a build to App Store Connect over the API alone — what Transporter
 * and Xcode's Organizer do, without a Mac. Apple added this at WWDC25: reserve
 * a build upload for a version + build number, reserve the IPA as a file under
 * it, PUT the bytes to the URLs Apple hands back (in parts, for a big binary),
 * commit the file, then wait for the build to come out the other end.
 *
 * PURE HTTP, like the signing gateway beside it: the release service owns the
 * row and decides what to do with each answer.
 */

/** One part of a file, as Apple describes it: where to PUT which bytes, with which headers. */
export interface UploadOperation {
  method: string;
  url: string;
  length: number;
  offset: number;
  requestHeaders: { name: string; value: string }[];
}

export interface BuildUploadRead {
  /** AWAITING_UPLOAD → PROCESSING → COMPLETE, or FAILED. */
  state: string;
  errors: string[];
  /** Apple's build id, once processing produced one. Empty before. */
  buildId: string;
}

/** What Apple's TestFlight processing made of the binary. */
export type BuildProcessingState = 'PROCESSING' | 'FAILED' | 'INVALID' | 'VALID';

/** A part is tens of megabytes at most; this is generous even on a slow link. */
const PART_TIMEOUT_MS = 10 * 60_000;

/** The upload operations as Apple sends them, on any asset reservation. */
export function parseOperations(raw: unknown): UploadOperation[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((op: any) => ({
    method: String(op.method ?? 'PUT'),
    url: String(op.url ?? ''),
    length: Number(op.length ?? 0),
    offset: Number(op.offset ?? 0),
    requestHeaders: Array.isArray(op.requestHeaders)
      ? op.requestHeaders.map((h: any) => ({ name: String(h.name ?? ''), value: String(h.value ?? '') }))
      : [],
  }));
}

/** One part, to the presigned URL Apple named, with exactly the headers it asked for. */
export async function putOperation(op: UploadOperation, bytes: Buffer): Promise<void> {
  const headers: Record<string, string> = {};
  for (const h of op.requestHeaders) headers[h.name] = h.value;
  const res = await fetch(op.url, {
    method: op.method,
    headers,
    body: bytes,
    signal: AbortSignal.timeout(PART_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Apple's upload store refused the part at offset ${op.offset} (HTTP ${res.status})`);
  }
}

/**
 * A file's parts, one after another, each read from disk only while it is
 * being sent — an IPA is never held whole in memory. `afterPart` runs between
 * parts so the caller can prove it is still alive.
 */
export async function putFileParts(
  path: string,
  operations: UploadOperation[],
  afterPart: () => Promise<void>
): Promise<void> {
  const handle = await fs.promises.open(path, 'r');
  try {
    for (const op of operations) {
      const buffer = Buffer.alloc(op.length);
      const { bytesRead } = await handle.read(buffer, 0, op.length, op.offset);
      await putOperation(op, bytesRead === op.length ? buffer : buffer.subarray(0, bytesRead));
      await afterPart();
    }
  } finally {
    await handle.close();
  }
}

/** The build Apple already holds for this version + build number, if any. */
export async function findBuild(
  token: string,
  appId: string,
  shortVersion: string,
  buildNumber: string
): Promise<{ id: string; processingState: BuildProcessingState } | null> {
  const query = new URLSearchParams({
    'filter[app]': appId,
    'filter[version]': buildNumber,
    'filter[preReleaseVersion.version]': shortVersion,
    'fields[builds]': 'processingState,version',
    limit: '1',
  });
  const res = await asc.get(token, `/builds?${query}`);
  const build = Array.isArray(res.data) ? res.data[0] : null;
  if (!build) return null;
  return { id: String(build.id), processingState: String(build.attributes?.processingState ?? 'PROCESSING') as BuildProcessingState };
}

/** Reserve the upload: Apple wants the version and build number BEFORE any bytes. */
export async function createBuildUpload(
  token: string,
  appId: string,
  shortVersion: string,
  buildNumber: string
): Promise<string> {
  const res = await asc.post(token, '/buildUploads', {
    type: 'buildUploads',
    attributes: { cfBundleShortVersionString: shortVersion, cfBundleVersion: buildNumber, platform: 'IOS' },
    relationships: { app: { data: { type: 'apps', id: appId } } },
  });
  return String(res.data.id);
}

/** Reserve the IPA under the upload; the answer says where each part goes. */
export async function reserveBuildUploadFile(
  token: string,
  buildUploadId: string,
  fileName: string,
  fileSize: number
): Promise<{ id: string; operations: UploadOperation[] }> {
  const res = await asc.post(token, '/buildUploadFiles', {
    type: 'buildUploadFiles',
    attributes: { fileName, fileSize, assetType: 'ASSET', uti: 'com.apple.ipa' },
    relationships: { buildUpload: { data: { type: 'buildUploads', id: buildUploadId } } },
  });
  return { id: String(res.data.id), operations: parseOperations(res.data.attributes?.uploadOperations) };
}

/** Tell Apple every part is there. Processing starts from here. */
export async function commitBuildUploadFile(token: string, id: string): Promise<void> {
  await asc.patch(token, `/buildUploadFiles/${id}`, {
    type: 'buildUploadFiles',
    id,
    attributes: { uploaded: true },
  });
}

/** Throw away a reservation whose upload never completed. */
export async function deleteBuildUpload(token: string, id: string): Promise<void> {
  await asc.delete(token, `/buildUploads/${id}`);
}

/** Where the upload stands, and the build it became once Apple made one. */
export async function readBuildUpload(token: string, id: string): Promise<BuildUploadRead> {
  const query = new URLSearchParams({ include: 'build', 'fields[builds]': 'processingState' });
  const res = await asc.get(token, `/buildUploads/${id}?${query}`);
  const state = res.data?.attributes?.state ?? {};
  const errors = Array.isArray(state.errors)
    ? state.errors.map((e: any) => String(e.description ?? e.code ?? '')).filter(Boolean)
    : [];
  return {
    state: String(state.state ?? ''),
    errors,
    buildId: String(res.data?.relationships?.build?.data?.id ?? ''),
  };
}

/** Whether TestFlight processing has finished with the build, and how. */
export async function readBuildProcessingState(token: string, buildId: string): Promise<BuildProcessingState> {
  const query = new URLSearchParams({ 'fields[builds]': 'processingState' });
  const res = await asc.get(token, `/builds/${buildId}?${query}`);
  return String(res.data?.attributes?.processingState ?? 'PROCESSING') as BuildProcessingState;
}
