/**
 * The mention and `:emoji` helpers moved to `@duncit/utils` so the portals'
 * staff chat, mWeb and the native app share one copy. Re-exported here for the
 * staff chat's existing imports.
 */
export {
  EMOJI_QUERY,
  MENTION_QUERY,
  MENTION_TOKEN,
  applyEmoji,
  applyMention,
  emojiQuery,
  mentionQuery,
  splitMentions,
  type MentionEdit,
} from '@duncit/utils';
