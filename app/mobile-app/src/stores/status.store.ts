import { create } from 'zustand';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { CreatePostDocument, StatusFeedDocument, UploadImageDocument } from '@/graphql/status';
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
  fetch: (force?: boolean) => Promise<void>;
  /** Uploads the image then creates the status post and refetches the feed. */
  publish: (asset: StatusUploadAsset) => Promise<void>;
  /** Deletes one of my own stories (item 12) and refetches the feed. */
  deleteStory: (id: string) => Promise<void>;
}

/** Status (story) feed + publish pipeline: ImageKit upload → createPost. */
export const useStatusStore = create<StatusState>((set, get) => ({
  isLoading: false,
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
    const uploaded = await graphqlRequest(
      UploadImageDocument,
      { fileBase64, fileName, mimeType, folder: '/posts' },
      { auth: true },
    );
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
    await get().fetch(true);
  },
  deleteStory: async (id) => {
    await graphqlRequest(DeletePostDocument, { id }, { auth: true });
    await get().fetch(true);
  },
}));
