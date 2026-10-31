import { eventMatch, type ProductScope } from './product.filter';
import { countBy, countSeries } from './product.series';
import { screenTime } from './product.screens';
import { elementKeyExpr } from './product.elements';

/**
 * The drill-down behind one row of the Screens and Clickstream tables: the
 * trend, and where people came from and went next.
 */

export async function screenDetail(scope: ProductScope, screen: string) {
  const base = eventMatch(scope);
  const views = { ...base, event_name: 'screen_view', screen_name: screen };
  const [series, time, previous, next, elements, platforms] = await Promise.all([
    countSeries(views, scope.window),
    screenTime(scope),
    countBy(views, '$previous_screen'),
    countBy({ ...base, event_name: 'screen_view', previous_screen: screen }, '$screen_name'),
    countBy({ ...base, event_name: 'element_click', screen_name: screen }, elementKeyExpr),
    countBy(views, '$platform'),
  ]);
  const totalViews = series.counts.reduce((sum, value) => sum + value, 0);
  const totalTime = time.get(screen) ?? 0;
  return {
    screen_name: screen,
    views: totalViews,
    avg_time_ms: totalTime > 0 && totalViews > 0 ? Math.round(totalTime / totalViews) : null,
    buckets: series.buckets,
    views_series: series.counts,
    users_series: series.people,
    previous_screens: previous,
    next_screens: next,
    elements,
    platforms,
  };
}

export async function elementDetail(scope: ProductScope, screen: string, key: string) {
  const clicks = {
    ...eventMatch(scope),
    event_name: 'element_click',
    screen_name: screen,
    $expr: { $eq: [elementKeyExpr, { $literal: key }] },
  };
  const [series, platforms] = await Promise.all([countSeries(clicks, scope.window), countBy(clicks, '$platform')]);
  return {
    screen_name: screen,
    key,
    clicks: series.counts.reduce((sum, value) => sum + value, 0),
    buckets: series.buckets,
    clicks_series: series.counts,
    users_series: series.people,
    platforms,
  };
}
