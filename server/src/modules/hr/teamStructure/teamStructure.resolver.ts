import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { ITeamStructure, ITeamStructureNode, ITeamStructureShare } from './teamStructure.model';
import { monthlyCost } from './teamStructure.pay';
import { teamStructureService, type NodeInput } from './teamStructure.service';

/** Pay is HR-confidential, so SUPER_ADMIN and the HR seat only. */
export const HR_STRUCTURE_ROLES = ['SUPER_ADMIN', 'HR_MANAGER'] as const;

const iso = (d?: Date | null): string | null => (d ? d.toISOString() : null);
const idOf = (v: { toString(): string } | null | undefined): string | null => (v ? v.toString() : null);

const toStructure = (s: ITeamStructure) => ({
  id: s._id.toString(),
  name: s.name,
  description: s.description ?? null,
  currency: s.currency,
  updated_at: iso(s.updated_at),
});

/** `withPay` / `withKra` false drop the money fields / the scorecard, which is how a public link hides them. */
const toNode = (n: ITeamStructureNode, withPay: boolean, withKra = true) => ({
  ...n,
  id: n._id.toString(),
  structure_id: n.structure_id.toString(),
  parent_id: idOf(n.parent_id),
  user_id: idOf(n.user_id),
  pay: withPay ? n.pay : null,
  monthly_cost: withPay ? monthlyCost(n.pay) : null,
  kras: withKra ? n.kras : null,
});

const toShare = (s: ITeamStructureShare) => ({
  id: s._id.toString(),
  structure_id: s.structure_id.toString(),
  token: s.token,
  label: s.label ?? null,
  show_salary: s.show_salary,
  show_kpi_kra: s.show_kpi_kra,
  expires_at: iso(s.expires_at),
  revoked_at: iso(s.revoked_at),
});

const guard = (ctx: GraphQLContext) => requireRole(ctx, HR_STRUCTURE_ROLES);

export const teamStructureResolvers = {
  Query: {
    teamStructures: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      guard(ctx);
      const [rows, totals] = await Promise.all([teamStructureService.list(), teamStructureService.summaries()]);
      return rows.map((s) => {
        const total = totals.get(s._id.toString());
        return { ...toStructure(s), seat_count: total?.seats ?? 0, monthly_cost: Math.round((total?.cost ?? 0) * 100) / 100 };
      });
    },
    teamStructure: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      guard(ctx);
      const { structure, nodes } = await teamStructureService.view(args.id);
      return { structure: toStructure(structure), nodes: nodes.map((n) => toNode(n, true)) };
    },
    teamStructureShares: async (_p: unknown, args: { structure_id: string }, ctx: GraphQLContext) => {
      guard(ctx);
      return (await teamStructureService.shares(args.structure_id)).map(toShare);
    },
    publicTeamStructure: async (_p: unknown, args: { token: string }) => {
      const share = await teamStructureService.liveShare(args.token);
      if (!share) return null;
      const { structure, nodes } = await teamStructureService.view(share.structure_id.toString());
      return {
        structure: toStructure(structure),
        // A public link never carries the linked user or free-text notes.
        nodes: nodes.map((n) => toNode({ ...n, user_id: null, notes: null } as ITeamStructureNode, share.show_salary, share.show_kpi_kra)),
        show_salary: share.show_salary,
        show_kpi_kra: share.show_kpi_kra,
      };
    },
  },
  Mutation: {
    saveTeamStructure: async (
      _p: unknown,
      args: { id?: string | null; name: string; description?: string | null; currency?: string | null },
      ctx: GraphQLContext
    ) => {
      guard(ctx);
      return toStructure(await teamStructureService.saveStructure(args));
    },
    deleteTeamStructure: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      guard(ctx);
      return teamStructureService.deleteStructure(args.id);
    },
    upsertTeamStructureNode: async (_p: unknown, args: { structure_id: string; input: NodeInput }, ctx: GraphQLContext) => {
      guard(ctx);
      return toNode(await teamStructureService.upsertNode(args.structure_id, args.input), true);
    },
    deleteTeamStructureNode: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      guard(ctx);
      return teamStructureService.deleteNode(args.id);
    },
    createTeamStructureShare: async (
      _p: unknown,
      args: { structure_id: string; label?: string | null; show_salary?: boolean | null; show_kpi_kra?: boolean | null; expires_at?: string | null },
      ctx: GraphQLContext
    ) => {
      guard(ctx);
      return toShare(await teamStructureService.createShare(args));
    },
    revokeTeamStructureShare: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      guard(ctx);
      return teamStructureService.revokeShare(args.id);
    },
  },
};
