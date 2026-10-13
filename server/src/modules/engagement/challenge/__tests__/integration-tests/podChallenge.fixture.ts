import { Types } from 'mongoose';
import { ChallengeModel } from '../../challenge.model';
import { ChallengeToolModel } from '../../tools/challengeTool.model';
import { ChallengeCategoryMappingModel } from '../../mapping/challengeMapping.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { UserModel } from '@modules/access/user/user.model';
import { makeContext } from '@test/harness';

let seq = 0;
export const asUser = (id: unknown, roles: string[] = []) => makeContext({ id: String(id), roles }).user!;

export async function world(opts: { customise?: boolean; maxCompetitors?: number } = {}) {
  const host = await UserModel.create({ auth: { email: `h${++seq}@x.com` }, profile: { first_name: 'Host', last_name: 'H' } });
  const guest = await UserModel.create({ auth: { email: `g${++seq}@x.com` }, profile: { first_name: 'Guest', last_name: 'G' } });
  const sup = await CategoryModel.create({ name: 'Sports', slug: `sports-${seq}`, level: 'SUPER' });
  const sub = await CategoryModel.create({ name: 'Cricket', slug: `cricket-${seq}`, level: 'SUB', parent_id: sup._id });
  const tool = await ChallengeToolModel.create({ tool_type: 'SCORE_COUNTER', name: 'Runs', status: 'ACTIVE' });
  await ChallengeCategoryMappingModel.create({
    category_id: sub._id,
    level: 'SUB',
    enabled: true,
    allowed_tool_ids: [tool._id],
    allow_host_customization: !!opts.customise,
    require_challenge: true,
    max_competitors: opts.maxCompetitors ?? 0,
    default_template_id: null,
  });
  const template = await ChallengeModel.create({
    name: 'Cup',
    is_active: true,
    sub_category_id: sub._id,
    tool_instances: [
      {
        instance_id: 'runs',
        tool_id: tool._id,
        tool_type: 'SCORE_COUNTER',
        label: 'Runs',
        config: { counts_toward_total: true, weight: 1 },
      },
    ],
  });
  const club = await ClubModel.create({
    club_id: `club-${++seq}`,
    club_name: 'Club',
    super_category_id: sup._id,
    category_id: sub._id,
  });
  const pod = await PodModel.create({
    pod_id: `pod-${++seq}`,
    pod_title: 'Sunday Match',
    pod_hosts_id: [host._id],
    club_id: club._id,
    pod_description: 'd',
    pod_date_time: new Date('2026-08-01T18:00:00Z'),
    pod_end_date_time: new Date('2026-08-01T20:00:00Z'),
    pod_type: 'PAID',
    is_active: true,
  });
  await PodMemberModel.create({ pod_id: pod._id, user_id: guest._id, status: 'JOINED' });
  return { host, guest, pod, template, tool, sub, hostU: asUser(host._id), guestU: asUser(guest._id) };
}

export const input = (w: Awaited<ReturnType<typeof world>>) => ({ pod_id: String(w.pod._id), template_id: String(w.template._id) });
