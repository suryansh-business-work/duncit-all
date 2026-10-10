import { z } from 'zod';

type Translate = (key: string) => string;

export const ROSTER_NAME_MAX = 60;

const person = (t: Translate) => z.string().trim().min(1, t('mweb.challenge.errors.name')).max(ROSTER_NAME_MAX, t('mweb.challenge.errors.name'));

/**
 * Who takes part: competitors (players, or teams in TEAM mode), each team's
 * players, and the judges. A linked attendee is optional — a guest without the
 * app can still be scored — and the server re-checks every link.
 */
export const buildRosterSchema = (t: Translate) =>
  z.object({
    competitors: z
      .array(z.object({ competitor_id: z.string(), name: person(t), user_id: z.string() }))
      .min(1, t('mweb.challenge.errors.noCompetitors')),
    players: z.array(z.object({ player_id: z.string(), name: person(t), user_id: z.string(), team_id: z.string().min(1, t('mweb.challenge.errors.team')) })),
    judge_user_ids: z.array(z.string()),
  });

export type RosterValues = z.infer<ReturnType<typeof buildRosterSchema>>;

export interface AttendeeOption {
  user_id: string;
  name: string;
}
