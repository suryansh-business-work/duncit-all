import { parseJsonObject } from '@duncit/utils';
import type { PodChallengeStanding, PodChallengeTool } from '@duncit/gql-types';

/**
 * Small readers over the server's challenge view. Nothing here computes a
 * score: standings, ranks and winners arrive from the server as they are.
 */

export const parseConfig = parseJsonObject;

/** Grouped by how each tool is fed (the server's input_kind), not by its name. */
type ToolLike = Pick<PodChallengeTool, 'input_kind'>;

export const timersOf = <T extends ToolLike>(tools: T[]) => tools.filter((t) => t.input_kind === 'CLOCK');
export const ballotToolsOf = <T extends ToolLike>(tools: T[]) =>
  tools.filter((t) => t.input_kind === 'VOTE' || t.input_kind === 'RATE');
export const judgeToolsOf = <T extends ToolLike>(tools: T[]) => tools.filter((t) => t.input_kind === 'JUDGE');
export const roundToolOf = <T extends ToolLike>(tools: T[]) => tools.find((t) => t.input_kind === 'ROUND');

/** The leader(s) of a standings list, for the winner banner and announcements. */
export const leadersOf = (standings: Pick<PodChallengeStanding, 'rank' | 'name'>[]) =>
  standings.filter((s) => s.rank === 1).map((s) => s.name);
