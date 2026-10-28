import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { MANUAL_TEST_ROLES } from './manualTest.constants';
import { manualTestService as svc } from './manualTest.service';
import type { MoveCaseArgs } from './manualTestBoard.service';

/** Every read and write here is the Tests console's own: TESTS_MANAGER or SUPER_ADMIN. */
const allow = (ctx: GraphQLContext) => requireRole(ctx, MANUAL_TEST_ROLES);

type Paged = { offset?: number | null };

export const manualTestResolvers = {
  Query: {
    manualTestBoard: (_p: unknown, args: { filter?: unknown }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.board.board(args.filter);
    },
    manualTestColumnCases: (
      _p: unknown,
      args: Paged & { column_id: string; filter?: unknown },
      ctx: GraphQLContext
    ) => {
      allow(ctx);
      return svc.board.columnCases(args.column_id, args.filter, args.offset ?? 0);
    },
    manualTestCasesTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.cases.table(args.query);
    },
    manualTestCase: (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.cases.get(args.key);
    },
    manualTestCaseActivity: (_p: unknown, args: Paged & { id: string }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.activity.list(args.id, args.offset ?? 0);
    },
    manualTestComments: (_p: unknown, args: Paged & { case_id: string }, ctx: GraphQLContext) => {
      const user = allow(ctx);
      return svc.comments.list(args.case_id, args.offset ?? 0, user);
    },
    manualTestColumns: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.columns.list();
    },
    manualTestAssignees: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.cases.assignees();
    },
    manualTestLabels: (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.cases.labels(args.search);
    },
    manualTestSurfaces: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.cases.surfaces();
    },
  },
  Mutation: {
    createManualTestColumn: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.columns.create(args.input);
    },
    updateManualTestColumn: (_p: unknown, args: { id: string; input: unknown }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.columns.update(args.id, args.input);
    },
    reorderManualTestColumns: (_p: unknown, args: { ids: unknown }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.columns.reorder({ ids: args.ids });
    },
    deleteManualTestColumn: (
      _p: unknown,
      args: { id: string; target_column_id: string },
      ctx: GraphQLContext
    ) => {
      allow(ctx);
      return svc.columns.remove(args.id, args.target_column_id);
    },
    createManualCase: (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const user = allow(ctx);
      return svc.cases.create(args.input, user.id);
    },
    updateManualCase: (
      _p: unknown,
      args: { id: string; input: unknown; expected_updated_at?: string | null },
      ctx: GraphQLContext
    ) => {
      allow(ctx);
      return svc.cases.update(args.id, args.input, args.expected_updated_at);
    },
    moveManualCase: (_p: unknown, args: MoveCaseArgs, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.board.move(args);
    },
    deleteManualCase: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      allow(ctx);
      return svc.cases.remove(args.id);
    },
    addManualCaseComment: (_p: unknown, args: { case_id: string; body: unknown }, ctx: GraphQLContext) => {
      const user = allow(ctx);
      return svc.comments.add(args.case_id, { body: args.body }, user);
    },
    editManualCaseComment: (_p: unknown, args: { id: string; body: unknown }, ctx: GraphQLContext) => {
      const user = allow(ctx);
      return svc.comments.edit(args.id, { body: args.body }, user);
    },
    deleteManualCaseComment: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = allow(ctx);
      return svc.comments.remove(args.id, user);
    },
  },
};
