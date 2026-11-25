import { useState } from 'react';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AuthAlert } from '@/screens/auth/AuthAlert';
import { DuncitButton } from '@/components/DuncitButton';
import type { NearbyScan } from '@/features/leads-list/useNearbySearch';
import { NearbyLeadsForm, type NearbyLeadsValues } from '@/forms/nearby-leads';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadListSheet } from './LeadListSheet';

interface Props {
  open: boolean;
  search: NearbyLeadsValues | null;
  scan: NearbyScan;
  onSubmit: (values: NearbyLeadsValues) => void;
  onClose: () => void;
}

/** How many leads the search found, worded as the portal words it. */
function foundText(
  scan: Extract<NearbyScan, { phase: 'done' }>,
  km: number,
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (scan.total === 1) return t('crm.nearby.foundOne', { vars: { km } });
  if (scan.total > 1) return t('crm.nearby.foundMany', { vars: { count: scan.total, km } });
  return t('crm.nearby.none', { vars: { km } });
}

/** The scan while it runs, and its answer (the count, or what went wrong). */
function NearbyScanView({
  scan,
  km,
  onChange,
  onView,
}: Readonly<{ scan: NearbyScan; km: number; onChange: () => void; onView: () => void }>) {
  const { t } = useTranslation();
  const change = (
    <DuncitButton
      label={t('crm.nearby.changeSearch')}
      onPress={onChange}
      variant="outline"
      testID="nearby-change"
    />
  );
  if (scan.phase === 'error') {
    return (
      <YStack gap="$3">
        <AuthAlert message={scan.message} testID="nearby-error" />
        {change}
      </YStack>
    );
  }
  if (scan.phase !== 'done') {
    return (
      <YStack alignItems="center" gap="$3" padding="$5" aria-busy>
        <Spinner color="$accentText" />
        <Text color="$muted" aria-live="polite" testID="nearby-scanning">
          {scan.phase === 'locating'
            ? t('crm.nearby.locating')
            : t('crm.nearby.scanning', { vars: { km } })}
        </Text>
      </YStack>
    );
  }
  return (
    <YStack gap="$3">
      <Text
        fontSize="$6"
        fontWeight="700"
        textAlign="center"
        aria-live="polite"
        testID="nearby-result"
      >
        {foundText(scan, km, t)}
      </Text>
      {scan.unplaced ? (
        <Text color="$info" testID="nearby-unplaced">
          {t('crm.nearby.unplaced', { vars: { count: scan.unplaced } })}
        </Text>
      ) : null}
      <XStack justifyContent="flex-end" gap="$2">
        {change}
        {scan.total > 0 ? (
          <DuncitButton label={t('crm.nearby.viewLeads')} onPress={onView} testID="nearby-view" />
        ) : null}
      </XStack>
    </YStack>
  );
}

/** Leads listing › Nearby leads: the search form, then the scan and its count (the portal's dialog). */
export function LeadListNearbySheet({ open, search, scan, onSubmit, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<'form' | 'scan'>('form');
  const close = () => {
    setView('form');
    onClose();
  };
  return (
    <LeadListSheet open={open} title={t('crm.nearby.title')} onClose={close} testID="nearby-sheet">
      {view === 'form' ? (
        <YStack gap="$3">
          <Text color="$muted">{t('crm.nearby.intro')}</Text>
          <NearbyLeadsForm
            initialValues={search}
            onSubmit={(values) => {
              setView('scan');
              onSubmit(values);
            }}
          />
        </YStack>
      ) : (
        <NearbyScanView
          scan={scan}
          km={search?.radius_km ?? 0}
          onChange={() => setView('form')}
          onView={close}
        />
      )}
    </LeadListSheet>
  );
}
