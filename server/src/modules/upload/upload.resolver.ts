import {
  getImagekitAuth,
  uploadBase64Image,
  importRemoteImage,
  importRemoteMedia,
  pexelsSearch,
  pexelsSearchVideos,
} from './upload.service';
import type { GraphQLContext } from '../../context';
import { requireAuth } from '../../middleware/rbac';

export const uploadResolvers = {
  Query: {
    pexelsSearch: (
      _p: unknown,
      args: { query?: string; page?: number; perPage?: number },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return pexelsSearch({
        query: args.query,
        page: args.page,
        perPage: args.perPage,
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
      args: { fileBase64: string; fileName: string; mimeType?: string; folder?: string },
      ctx: GraphQLContext
    ) => {
      requireAuth(ctx);
      return uploadBase64Image(args);
    },
  },
};
