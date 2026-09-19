import { Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsTypeGroup } from '@duncit/gql-types';

type Translate = ReturnType<typeof useTranslation>['t'];

const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/**
 * The verdict for one type's two counts.
 *
 * Only the types that name a host are judged. A TXT verification token or an MX
 * route belongs to the domain rather than to one replica of it, so "0 on
 * staging" is correct there and colouring it red would train people to ignore
 * the colour.
 */
function CountVerdict({ group, paired, t }: Readonly<{ group: DnsTypeGroup; paired: boolean; t: Translate }>) {
  if (!paired) {
    return <Chip size="small" variant="outlined" label={t('tech.dnsStaging.notCompared')} />;
  }
  const match = group.production === group.staging;
  return (
    <Chip
      size="small"
      color={match ? 'success' : 'error'}
      label={match ? t('tech.dnsStaging.countsMatch') : t('tech.dnsStaging.countsDiffer')}
    />
  );
}

interface Props {
  byType: DnsTypeGroup[];
  pairedTypes: string[];
}

/** Every record type in the zone, split into what production and staging each hold. */
export default function TypeCountsCard({ byType, pairedTypes }: Readonly<Props>) {
  const { t } = useTranslation();
  const paired = new Set(pairedTypes);

  return (
    <SectionCard title={t('tech.dnsStaging.byTypeTitle')} subtitle={t('tech.dnsStaging.byTypeSubtitle')}>
      <Table size="small" data-testid="dns-staging-type-counts">
        <TableHead>
          <TableRow>
            <TableCell>{t('shell.common.type')}</TableCell>
            <TableCell align="right">{t('tech.dns.scopeProduction')}</TableCell>
            <TableCell align="right">{t('tech.dns.scopeStaging')}</TableCell>
            <TableCell align="right">{t('tech.dnsStaging.colTotal')}</TableCell>
            <TableCell>{t('shell.common.status')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {byType.map((group) => (
            <TableRow key={group.type} data-testid={`dns-staging-type-${group.type.toLowerCase()}`}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {group.type}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={NUM}>
                {group.production}
              </TableCell>
              <TableCell align="right" sx={NUM}>
                {group.staging}
              </TableCell>
              <TableCell align="right" sx={NUM}>
                {group.total}
              </TableCell>
              <TableCell>
                <CountVerdict group={group} paired={paired.has(group.type)} t={t} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {byType.length === 0 && (
        <Stack sx={{ py: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tech.dns.empty')}
          </Typography>
        </Stack>
      )}
    </SectionCard>
  );
}
