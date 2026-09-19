import { Box, Chip, Stack, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsDomainInfo } from '@duncit/gql-types';

/**
 * A protection that is OFF is the thing worth seeing, so the chip colour tracks
 * "on", not "true": every one of these being on is the safe resting state, and
 * an off one is what somebody has to decide about.
 */
interface Protection {
  key: string;
  label: string;
  hint: string;
  on: boolean | null | undefined;
}

const stateColor = (on: boolean | null | undefined) => {
  if (on === null || on === undefined) return 'default';
  return on ? 'success' : 'warning';
};

const GRID = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
} as const;

function ProtectionRow({ item, onLabel, offLabel, unknownLabel }: Readonly<{
  item: Protection;
  onLabel: string;
  offLabel: string;
  unknownLabel: string;
}>) {
  let label = unknownLabel;
  if (item.on === true) label = onLabel;
  else if (item.on === false) label = offLabel;
  return (
    <Stack spacing={0.5} data-testid={`domain-protection-${item.key}`}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {item.label}
        </Typography>
        <Chip size="small" label={label} color={stateColor(item.on)} variant="outlined" />
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {item.hint}
      </Typography>
    </Stack>
  );
}

interface Props {
  info: DnsDomainInfo;
}

/** The registrar-side switches that decide who can move or lapse this domain. */
export default function DomainProtections({ info }: Readonly<Props>) {
  const { t } = useTranslation();
  const items: Protection[] = [
    { key: 'renew-auto', label: t('tech.domain.autoRenew'), hint: t('tech.domain.autoRenewHint'), on: info.renew_auto },
    { key: 'locked', label: t('tech.domain.registrarLock'), hint: t('tech.domain.registrarLockHint'), on: info.locked },
    {
      key: 'transfer-protected',
      label: t('tech.domain.transferProtected'),
      hint: t('tech.domain.transferProtectedHint'),
      on: info.transfer_protected,
    },
    {
      key: 'expiration-protected',
      label: t('tech.domain.expirationProtected'),
      hint: t('tech.domain.expirationProtectedHint'),
      on: info.expiration_protected,
    },
    { key: 'privacy', label: t('tech.domain.privacy'), hint: t('tech.domain.privacyHint'), on: info.privacy },
    {
      key: 'hold-registrar',
      // A registrar hold is the one flag here whose safe state is OFF, so it is
      // reported as "no hold" rather than inverted into a protection.
      label: t('tech.domain.registrarHold'),
      hint: t('tech.domain.registrarHoldHint'),
      on: info.hold_registrar === null || info.hold_registrar === undefined ? info.hold_registrar : !info.hold_registrar,
    },
  ];

  return (
    <SectionCard title={t('tech.domain.protectionsTitle')} subtitle={t('tech.domain.protectionsSubtitle')}>
      <Box sx={GRID}>
        {items.map((item) => (
          <ProtectionRow
            key={item.key}
            item={item}
            onLabel={t('tech.domain.protectionOn')}
            offLabel={t('tech.domain.protectionOff')}
            unknownLabel={t('tech.domain.protectionUnknown')}
          />
        ))}
      </Box>
    </SectionCard>
  );
}
