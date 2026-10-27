import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type {
  UnitTestCaseStatus,
  UnitTestFileKind,
  UnitTestFileStatus,
  UnitTestRunStatus,
  UnitTestRunTrigger,
  UnitTestRunner,
  UnitTestWorkflow,
  UnitTestWorkspaceStatus,
} from '@duncit/gql-types';

/** Every enum the unit pages show, as the reader's words. One place, so a chip and its filter never disagree. */
export interface UnitLabels {
  runStatus: Record<UnitTestRunStatus, string>;
  trigger: Record<UnitTestRunTrigger, string>;
  workflow: Record<UnitTestWorkflow, string>;
  runner: Record<UnitTestRunner, string>;
  workspaceStatus: Record<UnitTestWorkspaceStatus, string>;
  fileKind: Record<UnitTestFileKind, string>;
  fileStatus: Record<UnitTestFileStatus, string>;
  caseStatus: Record<UnitTestCaseStatus, string>;
}

export function useUnitLabels(): UnitLabels {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      runStatus: {
        QUEUED: t('testsUnit.status.queued'),
        RUNNING: t('testsUnit.status.running'),
        PASSED: t('testsUnit.status.passed'),
        FAILED: t('testsUnit.status.failed'),
        CANCELLED: t('testsUnit.status.cancelled'),
      },
      trigger: {
        PUSH: t('testsUnit.trigger.push'),
        SCHEDULE: t('testsUnit.trigger.schedule'),
        PORTAL: t('testsUnit.trigger.portal'),
        MANUAL: t('testsUnit.trigger.manual'),
      },
      workflow: {
        SONAR: t('testsUnit.workflow.sonar'),
        COVERAGE: t('testsUnit.workflow.coverage'),
      },
      runner: {
        VITEST: t('testsUnit.kind.vitest'),
        JEST: t('testsUnit.kind.jest'),
        OTHER: t('testsUnit.kind.other'),
      },
      workspaceStatus: {
        PASSED: t('testsUnit.status.passed'),
        FAILED: t('testsUnit.status.failed'),
        ERROR: t('testsUnit.status.error'),
        REUSED: t('testsUnit.status.reused'),
        NO_TESTS: t('testsUnit.status.noTests'),
      },
      fileKind: {
        VITEST: t('testsUnit.kind.vitest'),
        JEST: t('testsUnit.kind.jest'),
        CYPRESS_COMPONENT: t('testsUnit.kind.cypressComponent'),
        CYPRESS_E2E: t('testsUnit.kind.cypressE2e'),
      },
      fileStatus: {
        PASSED: t('testsUnit.status.passed'),
        FAILED: t('testsUnit.status.failed'),
        SKIPPED: t('testsUnit.status.skipped'),
        NOT_RUN: t('testsUnit.status.notRun'),
      },
      caseStatus: {
        PASSED: t('testsUnit.status.passed'),
        FAILED: t('testsUnit.status.failed'),
        SKIPPED: t('testsUnit.status.skipped'),
        TODO: t('testsUnit.status.todo'),
      },
    }),
    [t]
  );
}

/** A label map as the options of an enum column's filter. */
export function optionsOf<K extends string>(labels: Readonly<Record<K, string>>) {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}
