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
import { requireAuth, requireRole } from '@middleware/rbac';
import { mediaLibraryService } from './mediaLibrary.service';

/**
 * Anyone signed in may browse and upload — the file manager is a shared drawer
 * in every portal's header. Changing or destroying what is already there is a
 * different act: a file is used by whoever linked it, and its URL does not say
 * who that is.
 */
const MEDIA_WRITE_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER'];

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
    mediaFiles: (
      _p: unknown,
      args: {
        search?: string | null;
        path?: string | null;
        fileType?: string | null;
        skip?: number | null;
        limit?: number | null;
        sort?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return mediaLibraryService.list(args);
    },
    mediaFile: (_p: unknown, args: { fileId: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return mediaLibraryService.byId(args.fileId);
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
    deleteMediaFiles: (_p: unknown, args: { fileIds: string[] }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, MEDIA_WRITE_ROLES);
      return mediaLibraryService.remove(args.fileIds ?? [], user);
    },
    renameMediaFile: (
      _p: unknown,
      args: { fileId: string; newFileName: string; purgeCache?: boolean | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, MEDIA_WRITE_ROLES);
      return mediaLibraryService.rename(args.fileId, args.newFileName, args.purgeCache === true);
    },
    updateMediaFile: (
      _p: unknown,
      args: { fileId: string; tags?: string[] | null; customCoordinates?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, MEDIA_WRITE_ROLES);
      return mediaLibraryService.update(args.fileId, args);
    },
    purgeMediaCache: (_p: unknown, args: { url: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MEDIA_WRITE_ROLES);
      return mediaLibraryService.purge(args.url);
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
