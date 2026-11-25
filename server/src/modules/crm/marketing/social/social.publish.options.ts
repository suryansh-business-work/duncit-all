import { GraphQLError } from 'graphql';
import type { PublishContent, SocialPlatform, SocialPostType } from './social.types';

/**
 * A post's type, per-network captions and Instagram first comment: read from
 * the composer's input, handed to the rules and the publisher as part of the
 * content, and stored with only what applies to the networks the post goes to
 * (a caption for a network not picked, or a first comment with no Instagram
 * account, is dropped rather than kept unseen — as collaborators are).
 */
export interface PostOptionsInput {
  post_type?: SocialPostType | null;
  captions?: { platform: SocialPlatform; text: string }[] | null;
  first_comment?: string | null;
}

export interface StoredPostOptions {
  post_type?: SocialPostType;
  captions?: { platform: SocialPlatform; text: string }[];
  first_comment?: string;
}

/** What a stored post carries of these, as the publisher reads it back. */
export interface PostOptionsDoc {
  post_type?: SocialPostType | null;
  captions?: { platform: SocialPlatform; text: string }[] | null;
  first_comment?: string | null;
}

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/** The captions with text, one per network; a network named twice is refused. */
function captionList(input: PostOptionsInput): { platform: SocialPlatform; text: string }[] {
  const list = (input.captions ?? []).map((caption) => ({ platform: caption.platform, text: caption.text.trim() })).filter((caption) => caption.text);
  const seen = new Set<SocialPlatform>();
  for (const caption of list) {
    if (seen.has(caption.platform)) badInput(`Write one caption for ${caption.platform}, not two.`);
    seen.add(caption.platform);
  }
  return list;
}

/** The options as part of the content the rules check: every caption given, the type, the first comment. */
export function contentOptions(input: PostOptionsInput): Pick<PublishContent, 'post_type' | 'captions' | 'first_comment'> {
  const captions = captionList(input);
  const comment = input.first_comment?.trim() ?? '';
  return {
    ...(input.post_type && input.post_type !== 'FEED' ? { post_type: input.post_type } : {}),
    ...(captions.length > 0 ? { captions: Object.fromEntries(captions.map((caption) => [caption.platform, caption.text])) } : {}),
    ...(comment ? { first_comment: comment } : {}),
  };
}

/** What is stored: the type, the captions for networks the post goes to, and the first comment when Instagram is one of them. */
export function storedOptions(input: PostOptionsInput, platforms: readonly string[]): StoredPostOptions {
  const going = new Set(platforms);
  const captions = captionList(input).filter((caption) => going.has(caption.platform));
  const comment = input.first_comment?.trim() ?? '';
  return {
    post_type: input.post_type ?? 'FEED',
    captions: captions.length > 0 ? captions : undefined,
    first_comment: comment && going.has('INSTAGRAM') ? comment : undefined,
  };
}

/** A stored post's options as content, for the publisher. */
export const optionsOfDoc = (doc: PostOptionsDoc): Pick<PublishContent, 'post_type' | 'captions' | 'first_comment'> =>
  contentOptions({ post_type: doc.post_type ?? null, captions: doc.captions ?? null, first_comment: doc.first_comment ?? null });

/** A stored post's options as the API shows them. */
export const pubOptions = (doc: PostOptionsDoc) => ({
  post_type: doc.post_type ?? 'FEED',
  captions: (doc.captions ?? []).map((caption) => ({ platform: caption.platform, text: caption.text })),
  first_comment: doc.first_comment ?? '',
});
