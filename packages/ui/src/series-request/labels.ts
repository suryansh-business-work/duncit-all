/**
 * The copy a recurring pod's grouped venue request renders, built from the
 * calling surface's translator. Every key is written out literally (the
 * shipped-key gate greps for it); mWeb and the app share `mweb.*`, every MUI
 * portal shares `shell.*`, word-for-word identical.
 */

export type SeriesRequestTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

export interface SeriesRequestLabels {
  summary: (count: number, from: string, to: string) => string;
  acceptAll: (count: number) => string;
  declineAll: (count: number) => string;
  declineAllShort: string;
  declineReason: string;
  cancel: string;
  answerEach: string;
}

export function mwebSeriesRequestLabels(t: SeriesRequestTranslate): SeriesRequestLabels {
  return {
    summary: (count, from, to) => t('mweb.podSeries.requestSummary', { vars: { count, from, to } }),
    acceptAll: (count) => t('mweb.podSeries.acceptAll', { vars: { count } }),
    declineAll: (count) => t('mweb.podSeries.declineAll', { vars: { count } }),
    declineAllShort: t('mweb.podSeries.declineAllShort'),
    declineReason: t('mweb.podSeries.declineReason'),
    cancel: t('mweb.common.cancel'),
    answerEach: t('mweb.podSeries.answerEach'),
  };
}

export function shellSeriesRequestLabels(t: SeriesRequestTranslate): SeriesRequestLabels {
  return {
    summary: (count, from, to) => t('shell.podSeries.requestSummary', { vars: { count, from, to } }),
    acceptAll: (count) => t('shell.podSeries.acceptAll', { vars: { count } }),
    declineAll: (count) => t('shell.podSeries.declineAll', { vars: { count } }),
    declineAllShort: t('shell.podSeries.declineAllShort'),
    declineReason: t('shell.podSeries.declineReason'),
    cancel: t('shell.common.cancel'),
    answerEach: t('shell.podSeries.answerEach'),
  };
}
