import { linkPreviewService, type LinkPreviewKind } from './linkPreview.service';

export const linkPreviewResolvers = {
  Query: {
    // Public by design: link-preview crawlers carry no session. The service is
    // the privacy boundary — it only ever returns title/description/image.
    linkPreview: async (
      _p: unknown,
      args: { kind: LinkPreviewKind; id: string; secondary_id?: string | null }
    ) => linkPreviewService.resolve(args.kind, args.id, args.secondary_id ?? null),
  },
};
