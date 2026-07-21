import {
  getImagekitAuth,
  uploadBase64Image,
  importRemoteImage,
  importRemoteMedia,
  pexelsSearch,
  pexelsSearchVideos,
} from './upload.service';
import { getVideoCompressionJob, startVideoCompression } from './videoCompression';
import type { CropRect } from './mediaProcessing';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';

export const uploadResolvers = {
  Query: {
    pexelsSearch: (
      _p: unknown,
      args: { query?: string; page?: number; perPage?: number; orientation?: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return pexelsSearch({
        query: args.query,
        page: args.page,
        perPage: args.perPage,
        orientation: args.orientation,
      });
    },
    pexelsSearchVideos: (
      _p: unknown,
      args: { query?: string; page?: number; perPage?: number; orientation?: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return pexelsSearchVideos({
        query: args.query,
        page: args.page,
        perPage: args.perPage,
        orientation: args.orientation,
      });
    },
    videoCompressionJob: (_p: unknown, args: { job_id: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return getVideoCompressionJob(args.job_id);
    },
  },
  Mutation: {
    getImagekitAuth: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return getImagekitAuth();
    },
    importRemoteImageToImagekit: (
      _p: unknown,
      args: { remoteUrl: string; folder?: string; fileName?: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return importRemoteImage({
        remoteUrl: args.remoteUrl,
        folder: args.folder,
        fileName: args.fileName,
      });
    },
    importRemoteMediaToImagekit: (
      _p: unknown,
      args: { remoteUrl: string; folder?: string; fileName?: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return importRemoteMedia({
        remoteUrl: args.remoteUrl,
        folder: args.folder,
        fileName: args.fileName,
      });
    },
    uploadImageToImagekit: (
      _p: unknown,
      args: {
        fileBase64: string;
        fileName: string;
        mimeType?: string;
        folder?: string;
        allow_documents?: boolean;
        surface?: string;
        crop?: CropRect | null;
        crop_preset?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return uploadBase64Image({
        ...args,
        allowDocuments: args.allow_documents,
        cropPresetKey: args.crop_preset,
        userId: ctx.user?.id ?? null,
      });
    },
    startVideoCompression: (
      _p: unknown,
      args: {
        remote_url: string;
        folder?: string;
        surface?: string;
        trim_start_seconds?: number | null;
        trim_duration_seconds?: number | null;
      },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return startVideoCompression({
        remoteUrl: args.remote_url,
        folder: args.folder,
        surface: args.surface,
        trimStartSeconds: args.trim_start_seconds,
        trimDurationSeconds: args.trim_duration_seconds,
      });
    },
  },
};
