import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { RegressionBucket, RegressionKind, RegressionStatus } from '@duncit/gql-types';

export interface RegressionLabels {
  kind: Record<RegressionKind, string>;
  status: Record<RegressionStatus, string>;
  bucket: Record<RegressionBucket, string>;
}

/** The regression enums in the reader's words — chips, filters and tabs share them. */
export function useRegressionLabels(): RegressionLabels {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      kind: {
        UNIT: t('testsUnit.regression.kind.unit'),
        E2E: t('testsUnit.regression.kind.e2e'),
      },
      status: {
        CLEAN: t('testsUnit.regression.status.clean'),
        REGRESSED: t('testsUnit.regression.status.regressed'),
      },
      bucket: {
        REGRESSED: t('testsUnit.regression.bucket.regressed'),
        FIXED: t('testsUnit.regression.bucket.fixed'),
        STILL_FAILING: t('testsUnit.regression.bucket.stillFailing'),
        NEW_FAILING: t('testsUnit.regression.bucket.newFailing'),
        NEW_TESTS: t('testsUnit.regression.bucket.newTests'),
        REMOVED_TESTS: t('testsUnit.regression.bucket.removedTests'),
      },
    }),
    [t]
  );
}

/** Each bucket's count field, in the order the tabs show them. */
export const BUCKET_COUNTS: ReadonlyArray<{
  bucket: RegressionBucket;
  field: 'regressed' | 'fixed' | 'still_failing' | 'new_failing' | 'new_tests' | 'removed_tests';
}> = [
  { bucket: 'REGRESSED', field: 'regressed' },
  { bucket: 'NEW_FAILING', field: 'new_failing' },
  { bucket: 'STILL_FAILING', field: 'still_failing' },
  { bucket: 'FIXED', field: 'fixed' },
  { bucket: 'NEW_TESTS', field: 'new_tests' },
  { bucket: 'REMOVED_TESTS', field: 'removed_tests' },
];
