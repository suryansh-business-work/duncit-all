import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import Facts from '../../Facts';
import type { LogDetail } from '../queries';

/** What the person signed in from — the user agent and device id are what a reviewer matches against another record. */
export default function DeviceSection({ detail }: Readonly<{ detail: LogDetail }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.loginVerifications.device.title')}>
      <Facts
        items={[
          { label: t('tech.loginVerifications.device.browser'), value: detail.browser },
          { label: t('tech.loginVerifications.device.os'), value: detail.os },
          { label: t('tech.loginVerifications.device.deviceType'), value: detail.device_type },
          { label: t('tech.common.platform'), value: detail.platform },
          { label: t('tech.loginVerifications.device.language'), value: detail.language },
          { label: t('tech.common.deviceId'), value: detail.duid, mono: true },
          { label: t('tech.loginVerifications.device.userAgent'), value: detail.user_agent, mono: true, wide: true },
        ]}
      />
    </SectionCard>
  );
}
