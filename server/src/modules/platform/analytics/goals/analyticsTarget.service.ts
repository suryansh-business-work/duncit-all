import { GraphQLError } from 'graphql';
import type { AnalyticsEntity, AnalyticsKpi } from '../entity/shapes';
import { AnalyticsTargetModel } from './analyticsTarget.model';

/** A monthly goal is read against a period of this many days as its own. */
const MONTH_DAYS = 30;
const KEY = /^[a-z][a-z\d_]{1,63}$/;

/** A number that happens over time — scaled with the period, unlike a rate or a live count. */
const accrues = (kpi: AnalyticsKpi) => kpi.previous !== null && (kpi.format === 'COUNT' || kpi.format === 'CURRENCY');

/** The goal a tile is judged against over `days`: the monthly goal scaled for a count, as set for anything else. */
function targetFor(kpi: AnalyticsKpi, goal: number, days: number): number {
  return accrues(kpi) ? Math.round((goal * days) / MONTH_DAYS) : goal;
}

export const analyticsTargetService = {
  async goalsFor(entity: AnalyticsEntity): Promise<Map<string, number>> {
    const rows = await AnalyticsTargetModel.find({ entity }).select('kpi_key value').lean();
    return new Map(rows.map((row) => [row.kpi_key, row.value]));
  },

  /** Every tile with its goal, as set and as it applies to this period. */
  withTargets<K extends AnalyticsKpi>(kpis: readonly K[], goals: ReadonlyMap<string, number>, days: number) {
    return kpis.map((kpi) => {
      const goal = goals.get(kpi.key);
      return goal === undefined
        ? { ...kpi, target: null, target_goal: null }
        : { ...kpi, target: targetFor(kpi, goal, days), target_goal: goal };
    });
  },

  /** Set a tile's goal, or clear it with null. */
  async set(entity: AnalyticsEntity, kpiKey: string, value: number | null, by: string): Promise<boolean> {
    if (!KEY.test(kpiKey)) {
      throw new GraphQLError('That tile is not one Analytics shows.', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (value === null) {
      await AnalyticsTargetModel.deleteOne({ entity, kpi_key: kpiKey }).exec();
      return true;
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new GraphQLError('A target must be zero or more.', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await AnalyticsTargetModel.updateOne(
      { entity, kpi_key: kpiKey },
      { $set: { value, set_by: by } },
      { upsert: true }
    ).exec();
    return true;
  },
};
