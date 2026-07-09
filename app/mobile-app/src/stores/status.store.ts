import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import {
  CreatePostDocument,
  RecordStoryViewDocument,
  StatusFeedDocument,
  UploadImageDocument,
} from '@/graphql/status';
import { DeletePostDocument } from '@/graphql/posts';
import { graphqlRequest } from '@/services/graphql.client';

export type StatusFeed = ResultOf<typeof StatusFeedDocument>;

export interface StatusUploadAsset {
  base64?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType?: 'IMAGE' | 'VIDEO';
}

interface StatusState {
  data?: StatusFeed;
  isLoading: boolean;
  error?: unknown;
  /** Coarse upload progress 0–100 while publishing a story (Bug 1). */
  progress: number;
  /** Stories seen this session — greys their ring immediately without refetching
   * or mutating the feed (which would reset the open viewer) (Bug 2). */
  seenIds: Set<string>;
  fetch: (force?: boolean) => Promise<void>;
  /** Uploads the image then creates the status post and refetches the feed. */
  publish: (asset: StatusUploadAsset) => Promise<void>;
  /** Marks a story seen so its ring greys immediately, then persists it (Bug 2). */
  recordView: (id: string) => Promise<void>;
  /** Deletes one of my own stories (item 12) and refetches the feed. */
  deleteStory: (id: string) => Promise<void>;
}

/** Status (story) feed + publish pipeline: ImageKit upload → createPost. */
export const useStatusStore = create<StatusState>((set, get) => ({
  isLoading: false,
  progress: 0,
  seenIds: new Set<string>(),
  fetch: async (force = false) => {
    if (get().isLoading) return;
    if (get().data && !force) return;
    set({ isLoading: true, error: undefined });
    try {
      const data = await graphqlRequest(StatusFeedDocument, undefined, { auth: true });
      set({ data, isLoading: false });
    } catch (error) {
      set({ error, isLoading: false });
    }
  },
  publish: async (asset) => {
    if (!asset.base64) throw new Error('No media selected.');
    const isVideo = asset.mediaType === 'VIDEO';
    const mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
    const fileName = asset.fileName ?? `story-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
    const fileBase64 = `data:${mimeType};base64,${asset.base64}`;
    // Coarse, monotonic progress: base64-over-GraphQL can't report byte-level
    // upload, so we advance through the pipeline's stages (Bug 1).
    set({ progress: 10 });
    try {
      const uploaded = await graphqlRequest(
        UploadImageDocument,
        { fileBase64, fileName, mimeType, folder: '/posts' },
        { auth: true },
      );
      set({ progress: 70 });
      await graphqlRequest(
        CreatePostDocument,
        {
          input: {
            image_url: uploaded.uploadImageToImagekit.url,
            caption: '',
            kind: 'STORY',
            media_type: isVideo ? 'VIDEO' : 'IMAGE',
          },
        },
        { auth: true },
      );
      set({ progress: 95 });
      await get().fetch(true);
      set({ progress: 100 });
    } finally {
      set({ progress: 0 });
    }
  },
  recordView: async (id) => {
    if (get().seenIds.has(id)) return;
    set({ seenIds: new Set(get().seenIds).add(id) });
    await graphqlRequest(RecordStoryViewDocument, { id }, { auth: true }).catch(() => undefined);
  },
  deleteStory: async (id) => {
    await graphqlRequest(DeletePostDocument, { id }, { auth: true });
    await get().fetch(true);
  },
}));
