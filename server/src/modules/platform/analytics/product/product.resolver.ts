import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { ANALYTICS_ROLES } from '../entity/entityAnalytics.resolver';
import { productScope, type ProductFilterInput } from './product.filter';
import { screensTable } from './product.screens';
import { elementsTable } from './product.elements';
import { elementDetail, screenDetail } from './product.details';
import { sessionDetail, sessionsTable } from './product.sessions';
import { eventNames, eventsTable, screenNames } from './product.events';
import { productFunnel, type FunnelStepInput } from './product.funnel';
import { productRetention, type CohortBasis } from './product.retention';
import { productUser } from './product.users';
import { productUserSearch, productUserTimeline, type TimelineArgs } from './product.timeline';
import type { CohortGranularity } from './product.retention.calc';

/**
 * Analytics > Product. Every read is the Analytics console's: a member's own
 * activity and timeline are personal data, so they are read by its staff and
 * the admins who can open every console — never by the member's city admin.
 */

type Filtered = { filter?: ProductFilterInput | null };
type Table = Filtered & { query?: TableQueryInput | null };

const reader = (ctx: GraphQLContext) => requireRole(ctx, ANALYTICS_ROLES);

export const productAnalyticsResolvers = {
  Query: {
    productScreensTable: (_p: unknown, args: Table, ctx: GraphQLContext) => {
      reader(ctx);
      return screensTable(productScope(args.filter), args.query);
    },
    productScreen: (_p: unknown, args: Filtered & { screen_name: string }, ctx: GraphQLContext) => {
      reader(ctx);
      return screenDetail(productScope(args.filter), args.screen_name);
    },
    productElementsTable: (_p: unknown, args: Table, ctx: GraphQLContext) => {
      reader(ctx);
      return elementsTable(productScope(args.filter), args.query);
    },
    productElement: (_p: unknown, args: Filtered & { screen_name: string; key: string }, ctx: GraphQLContext) => {
      reader(ctx);
      return elementDetail(productScope(args.filter), args.screen_name, args.key);
    },
    productSessionsTable: (_p: unknown, args: Table, ctx: GraphQLContext) => {
      reader(ctx);
      return sessionsTable(productScope(args.filter), args.query);
    },
    productSession: (_p: unknown, args: { session_id: string }, ctx: GraphQLContext) => {
      reader(ctx);
      return sessionDetail(args.session_id);
    },
    productEventsTable: (_p: unknown, args: Table, ctx: GraphQLContext) => {
      reader(ctx);
      return eventsTable(productScope(args.filter), args.query);
    },
    productEventNames: (_p: unknown, args: Filtered, ctx: GraphQLContext) => {
      reader(ctx);
      return eventNames(productScope(args.filter));
    },
    productScreenNames: (_p: unknown, args: Filtered, ctx: GraphQLContext) => {
      reader(ctx);
      return screenNames(productScope(args.filter));
    },
    productFunnel: (
      _p: unknown,
      args: Filtered & { steps: FunnelStepInput[]; window_days?: number | null },
      ctx: GraphQLContext
    ) => {
      reader(ctx);
      return productFunnel(productScope(args.filter), args.steps, args.window_days);
    },
    productRetention: (
      _p: unknown,
      args: Filtered & { basis: CohortBasis; granularity?: CohortGranularity | 'MONTH' | null },
      ctx: GraphQLContext
    ) => {
      reader(ctx);
      const granularity = args.granularity === 'DAY' ? 'DAY' : 'WEEK';
      return productRetention(productScope(args.filter), args.basis, granularity);
    },
    productUser: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      reader(ctx);
      return productUser(args.user_id);
    },
    productUserTimeline: (_p: unknown, args: TimelineArgs, ctx: GraphQLContext) => {
      reader(ctx);
      return productUserTimeline(args);
    },
    productUserSearch: (_p: unknown, args: { search: string }, ctx: GraphQLContext) => {
      reader(ctx);
      return productUserSearch(args.search);
    },
  },
};
