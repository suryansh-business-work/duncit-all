import { GraphQLError } from 'graphql';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ChallengeScoreEventModel, ChallengeVoteModel } from './challengeLedger.model';
import type { PodRef } from './podChallenge.access';

/**
 * Validates the people taking part: competitors (players, or teams in TEAM
 * mode), team rosters and judges. A linked user must actually belong to the
 * pod (a host or a confirmed attendee); a competitor who already has scores
 * or votes cannot be removed, so a roster edit never orphans a score.
 */

export interface CompetitorInput {
  competitor_id?: string | null;
  name: string;
  user_id?: string | null;
}

export interface PlayerInput {
  player_id?: string | null;
  name: string;
  user_id?: string | null;
  team_id: string;
}

export interface RosterLimits {
  maxCompetitors: number;
  maxTeams: number;
  maxPlayersPerTeam: number;
}

const MAX_NAME = 60;

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

const newId = () => randomUUID().slice(0, 8);

async function podUserIds(pod: PodRef, userIds: string[]): Promise<Set<string>> {
  const wanted = [...new Set(userIds)];
  if (!wanted.length) return new Set();
  if (wanted.some((id) => !Types.ObjectId.isValid(id))) bad('Invalid user id');
  const hosts = (pod.pod_hosts_id ?? []).map((id) => id.toString());
  const members = await PodMemberModel.find({ pod_id: pod._id, user_id: { $in: wanted }, status: 'JOINED' })
    .select('user_id')
    .lean();
  return new Set([...hosts, ...members.map((m) => m.user_id.toString())].filter((id) => wanted.includes(id)));
}

export async function buildCompetitors(pod: PodRef, input: CompetitorInput[], limits: RosterLimits) {
  if (limits.maxCompetitors > 0 && input.length > limits.maxCompetitors) {
    bad(`This activity allows at most ${limits.maxCompetitors} competitors`);
  }
  const members = await podUserIds(pod, input.flatMap((c) => c.user_id ?? []));
  const seen = new Set<string>();
  return input.map((c) => {
    const name = c.name?.trim().slice(0, MAX_NAME);
    if (!name) bad('Every competitor needs a name');
    if (c.user_id && !members.has(c.user_id)) bad(`${name} is not a confirmed attendee of this pod`);
    const id = c.competitor_id?.trim() || newId();
    if (seen.has(id)) bad('Competitor ids must be unique');
    seen.add(id);
    return { competitor_id: id, name, user_id: c.user_id ? new Types.ObjectId(c.user_id) : null };
  });
}

export async function buildPlayers(pod: PodRef, input: PlayerInput[], teamIds: string[], limits: RosterLimits) {
  if (limits.maxTeams > 0 && teamIds.length > limits.maxTeams) bad(`At most ${limits.maxTeams} teams are allowed`);
  const members = await podUserIds(pod, input.flatMap((p) => p.user_id ?? []));
  const perTeam = new Map<string, number>();
  return input.map((p) => {
    const name = p.name?.trim().slice(0, MAX_NAME);
    if (!name) bad('Every player needs a name');
    if (!teamIds.includes(p.team_id)) bad(`${name} is assigned to a team that does not exist`);
    if (p.user_id && !members.has(p.user_id)) bad(`${name} is not a confirmed attendee of this pod`);
    const count = (perTeam.get(p.team_id) ?? 0) + 1;
    if (limits.maxPlayersPerTeam > 0 && count > limits.maxPlayersPerTeam) {
      bad(`A team can have at most ${limits.maxPlayersPerTeam} players`);
    }
    perTeam.set(p.team_id, count);
    return {
      player_id: p.player_id?.trim() || newId(),
      name,
      team_id: p.team_id,
      user_id: p.user_id ? new Types.ObjectId(p.user_id) : null,
    };
  });
}

export async function buildJudges(pod: PodRef, userIds: string[]) {
  const members = await podUserIds(pod, userIds);
  if (userIds.some((id) => !members.has(id))) bad('Judges must be hosts or confirmed attendees of this pod');
  return [...members].map((id) => new Types.ObjectId(id));
}

/** Refuses to drop a competitor that already has scores or votes. */
export async function assertRemovable(challengeId: Types.ObjectId, removedIds: string[]) {
  if (!removedIds.length) return;
  const [scored, voted] = await Promise.all([
    ChallengeScoreEventModel.exists({ challenge_id: challengeId, competitor_id: { $in: removedIds }, voided: false }),
    ChallengeVoteModel.exists({ challenge_id: challengeId, candidate_id: { $in: removedIds } }),
  ]);
  if (scored || voted) bad('A competitor with scores or votes cannot be removed — void their scores first');
}
