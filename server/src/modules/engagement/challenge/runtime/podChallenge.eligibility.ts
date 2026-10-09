import { CategoryModel } from '@modules/pods/category/category.model';
import { resolveClubCategory } from '@modules/pods/pod/pod.products';
import { ChallengeModel } from '../challenge.model';
import { challengeMappingService } from '../mapping/challengeMapping.service';
import { challengeToolService } from '../tools/challengeTool.service';
import type { PodRef } from './podChallenge.access';

/**
 * What a pod may run, derived from its category (a pod's category is its
 * club's Super + Sub). The nearest category mapping decides whether challenges
 * are on and which tools are allowed; a template is eligible when it is
 * active, every one of its tools is allowed and still active, and its own
 * category scope (if any) covers the pod's category.
 */

type Mapping = Awaited<ReturnType<typeof challengeMappingService.effective>>;

export interface PodEligibility {
  mapping: Mapping | null;
  chainIds: string[];
  activeToolIds: Set<string>;
}

async function categoryChain(leafId: string): Promise<string[]> {
  const ids: string[] = [];
  let next: string | null = leafId;
  while (next && ids.length < 3) {
    const cat: { parent_id?: unknown } | null = await CategoryModel.findById(next).select('parent_id').lean();
    if (!cat) break;
    ids.push(next);
    next = cat.parent_id ? String(cat.parent_id) : null;
  }
  return ids;
}

export async function podEligibility(pod: PodRef): Promise<PodEligibility> {
  const category = await resolveClubCategory(pod.club_id);
  const leaf = category?.sub_category_id ?? category?.super_category_id ?? null;
  if (!leaf) return { mapping: null, chainIds: [], activeToolIds: new Set() };
  const [mapping, chainIds] = await Promise.all([challengeMappingService.effective(leaf), categoryChain(leaf)]);
  const active = mapping.enabled ? await challengeToolService.activeByIds(mapping.allowed_tool_ids) : [];
  return { mapping, chainIds, activeToolIds: new Set(active.map((t) => t._id.toString())) };
}

interface TemplateLike {
  is_active?: boolean | null;
  tool_instances?: { tool_id: unknown }[] | null;
  super_category_id?: unknown;
  category_id?: unknown;
  sub_category_id?: unknown;
}

export function templateEligible(tpl: TemplateLike, e: PodEligibility): boolean {
  if (!tpl.is_active || !e.mapping?.enabled) return false;
  const tools = tpl.tool_instances ?? [];
  if (!tools.length || tools.some((t) => !e.activeToolIds.has(String(t.tool_id)))) return false;
  const scope = [tpl.super_category_id, tpl.category_id, tpl.sub_category_id].filter(Boolean).map(String);
  return scope.every((id) => e.chainIds.includes(id));
}

export async function eligibleTemplates(e: PodEligibility) {
  if (!e.mapping?.enabled) return [];
  const templates = await ChallengeModel.find({ is_active: true }).sort({ name: 1 }).lean();
  return templates.filter((t) => templateEligible(t, e));
}
