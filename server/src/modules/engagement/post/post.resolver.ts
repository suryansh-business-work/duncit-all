import { postService } from './post.service';
import { userService } from '@modules/access/user/user.service';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';

export const postResolvers = {
  Post: {
    author: async (parent: any) => {
      if (!parent.author_id) return null;
      try {
        return await userService.getById(parent.author_id);
      } catch {
        return null;
      }
    },
  },
  PostComment: {
    author: async (parent: any) => {
      if (!parent.author_id) return null;
      try {
        return await userService.getById(parent.author_id);
      } catch {
        return null;
      }
    },
  },
  Query: {
    posts: (_p: unknown, args: { author_id?: string }, ctx: GraphQLContext) =>
      postService.list(args.author_id ?? null, ctx.user?.id ?? null),
    post: (_p: unknown, args: { post_doc_id: string }, ctx: GraphQLContext) =>
      postService.getById(args.post_doc_id, ctx.user?.id ?? null),
    myPosts: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return postService.list(u.id, u.id);
    },
  },
  Mutation: {
    createPost: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return postService.create(u.id, args.input);
    },
    deletePost: (_p: unknown, args: { post_doc_id: string }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return postService.remove(args.post_doc_id, u.id);
    },
    togglePostLike: (_p: unknown, args: { post_doc_id: string }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return postService.toggleLike(args.post_doc_id, u.id);
    },
    addPostComment: (
      _p: unknown,
      args: { post_doc_id: string; text: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return postService.addComment(args.post_doc_id, u.id, args.text);
    },
    deletePostComment: (
      _p: unknown,
      args: { post_doc_id: string; comment_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return postService.deleteComment(args.post_doc_id, args.comment_id, u.id);
    },
  },
};
