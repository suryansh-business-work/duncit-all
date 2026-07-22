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
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo, type VideoTrim } from '@/services/video-compression';

export type StatusFeed = ResultOf<typeof StatusFeedDocument>;

export interface StatusUploadAsset {
  base64?: string | null;
  /** Picker URI — videos stream from it directly (no base64). */
  uri?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType?: 'IMAGE' | 'VIDEO';
  /** STORY (default, 24h ephemeral) vs POST (permanent profile post). The
   * profile "Add Post" flow sets POST; the story rail/avatar ring keep STORY. */
  kind?: 'STORY' | 'POST';
  /** Trim window (seconds) the server cuts during the FFmpeg pass — set when a
   * picked video runs past the 15s story cap. */
  trim?: VideoTrim | null;
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
    const isVideo = asset.mediaType === 'VIDEO';
    const kind = asset.kind ?? 'STORY';
    const mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
    const fileName = asset.fileName ?? `story-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
    set({ progress: isVideo ? 2 : 10 });
    try {
      let url: string;
      if (isVideo) {
        if (!asset.uri) throw new Error('No media selected.');
        // Videos stream from their URI with REAL byte progress (2–55), then the
        // server-side FFmpeg pass fills 55–70 — the old base64 path silently
        // sent corrupt bytes (the picker returns no base64 for videos).
        const rawUrl = await uploadToImagekitDirect(
          { uri: asset.uri, name: fileName, type: mimeType },
          '/posts',
          (pct) => set({ progress: 2 + Math.round(pct * 0.53) }),
        );
        url = await compressUploadedVideo(
          rawUrl,
          '/posts',
          (pct) => set({ progress: 55 + Math.round(pct * 0.15) }),
          asset.trim ?? null,
        );
      } else {
        if (!asset.base64) throw new Error('No media selected.');
        // Images go through the server so the admin Upload Settings apply
        // (sharp compression + AI image monitoring).
        const uploaded = await graphqlRequest(
          UploadImageDocument,
          {
            fileBase64: `data:${mimeType};base64,${asset.base64}`,
            fileName,
            mimeType,
            folder: '/posts',
            surface: 'MOBILE_MWEB',
          },
          { auth: true },
        );
        url = uploaded.uploadImageToImagekit.url;
      }
      set({ progress: 70 });
      await graphqlRequest(
        CreatePostDocument,
        {
          input: {
            image_url: url,
            caption: '',
            // STORY (default) is 24h-ephemeral; POST is a permanent profile post.
            kind,
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
