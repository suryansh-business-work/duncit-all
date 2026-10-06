import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';

/** The font roles with their labels — literal keys, one per role. */
export function useRoleLabels() {
  const { t } = useTranslation();
  return useMemo(
    () =>
      [
        { value: 'HEADING', label: t('websiteApp.cms.fonts.roleHeading') },
        { value: 'BODY', label: t('websiteApp.cms.fonts.roleBody') },
        { value: 'ACCENT', label: t('websiteApp.cms.fonts.roleAccent') },
        { value: 'NONE', label: t('websiteApp.cms.fonts.roleNone') },
      ] as const,
    [t],
  );
}
