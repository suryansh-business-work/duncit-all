/**
 * Reel Studio's shapes are the generated GraphQL types — nothing is restated
 * here, so a field the server adds is a compile error in the one place that
 * forgot to select it rather than a silent `undefined` on screen.
 */
export type {
  ReelAsset,
  ReelAssetKind,
  ReelDriveEntry,
  ReelDriveFolder,
  ReelDriveStatus,
  ReelMessage,
  ReelProject,
  ReelProjectSummary,
  ReelScene,
  ReelSpec,
} from '@duncit/gql-types';

/**
 * The AI Library category a prompt saved from the studio is filed under. It is
 * the same name the server gives the editor's own code prompts, so the library
 * lists the studio's standing instruction and the operator's saved requests
 * side by side.
 */
export const REEL_PROMPT_CATEGORY = 'Reel Studio';

/** Where chat uploads land in the media store. */
export const REEL_UPLOAD_FOLDER = '/ai/reels';

/** Pictures one chat message may carry — the server refuses more. */
export const MAX_ATTACHMENTS = 6;

/** The longest request the editor reads — the server refuses more. */
export const MAX_REQUEST_LENGTH = 2000;
