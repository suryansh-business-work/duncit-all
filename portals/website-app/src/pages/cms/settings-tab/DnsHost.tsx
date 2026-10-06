import { Chip, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CmsSiteDnsHost } from '@duncit/gql-types';
import type { ARecordTarget } from './ARecordDialog';

interface Props {
  entry: CmsSiteDnsHost;
  onEdit: (target: ARecordTarget) => void;
}

/** One hostname of the site and where the zone points it today. */
export default function DnsHost({ entry, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid={`cms-dns-host-${entry.host}`}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" component="h3" sx={{ flex: 1, wordBreak: 'break-all' }}>
            {entry.host}
          </Typography>
          {entry.in_zone && <Chip size="small" variant="outlined" label={t('websiteApp.cms.dns.name', { vars: { name: entry.name } })} />}
        </Stack>
        {!entry.in_zone && (
          <Typography variant="body2" color="text.secondary">
            {t('websiteApp.cms.dns.outOfZone')}
          </Typography>
        )}
        {entry.in_zone && entry.records.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('websiteApp.cms.dns.noRecords')}
          </Typography>
        )}
        {entry.records.map((record) => (
          <Stack key={record.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <Chip size="small" label={record.type} sx={{ alignSelf: 'flex-start' }} />
            <Typography component="code" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {record.data}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('websiteApp.cms.dns.ttl', { vars: { ttl: record.ttl } })}
            </Typography>
            {record.type === 'A' && (
              <DuncitButton
                size="small"
                startIcon={<EditOutlinedIcon />}
                aria-label={`${t('websiteApp.cms.dns.repoint')}: ${entry.host} ${record.data}`}
                onClick={() => onEdit({ host: entry.host, current: record.data, ttl: record.ttl })}
              >
                {t('websiteApp.cms.dns.repoint')}
              </DuncitButton>
            )}
          </Stack>
        ))}
        {entry.in_zone && (
          <DuncitButton
            size="small"
            startIcon={<AddIcon />}
            sx={{ alignSelf: 'flex-start' }}
            aria-label={`${t('websiteApp.cms.dns.add')}: ${entry.host}`}
            onClick={() => onEdit({ host: entry.host, current: null, ttl: null })}
          >
            {t('websiteApp.cms.dns.add')}
          </DuncitButton>
        )}
      </Stack>
    </Paper>
  );
}
