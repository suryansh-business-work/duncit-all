import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import type { EnvEntryMessages } from './env-entry.types';
import type { EnvProblem } from './env-validation';

/** The translation key for each finding — the same wording the server sends back. */
const PROBLEM_KEYS: Record<EnvProblem, string> = {
  url: 'tech.environment.envFieldUrl',
  hostname: 'tech.environment.envFieldHostname',
  email: 'tech.environment.envFieldEmail',
  phone: 'tech.environment.envFieldPhone',
  number: 'tech.environment.envFieldNumber',
  min: 'tech.environment.envFieldMin',
  max: 'tech.environment.envFieldMax',
  json: 'tech.environment.envFieldJson',
  jsonObject: 'tech.environment.envFieldJsonObject',
  pem: 'tech.environment.envFieldPem',
  list: 'tech.environment.envFieldList',
  fingerprints: 'tech.environment.envFieldFingerprints',
};

/** The environment entry form's validation copy, in the operator's language. */
export function useEnvEntryMessages(): EnvEntryMessages {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      nameRequired: t('tech.environment.envNameRequired'),
      required: (label: string) => t('tech.environment.envFieldRequired', { vars: { label } }),
      problem: ({ problem, bound }, label) =>
        t(PROBLEM_KEYS[problem], { vars: { label, bound: bound === undefined ? '' : String(bound) } }),
    }),
    [t]
  );
}
