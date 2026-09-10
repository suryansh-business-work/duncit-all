import { Grid, Link, Stack, Typography } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import CategoryIcon from '@mui/icons-material/Category';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import SectionCard from '../../venues/detail/SectionCard';
import type { HostDetail } from '../queries';

/**
 * The host record, read.
 *
 * Identity, the two verification documents, the categories they are approved to
 * run and where their payout goes — the same four things the editor writes, in
 * the same order, so moving between the two pages does not need re-orienting.
 */
const EMPTY = '—';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || EMPTY}</Typography>
    </Stack>
  );
}

function DocLink({ label, url }: Readonly<{ label: string; url: string }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      {url ? (
        <Link href={url} target="_blank" rel="noreferrer" variant="body2">
          {t('directory.hostEditor.openDocument')}
        </Link>
      ) : (
        <Typography variant="body2">{EMPTY}</Typography>
      )}
    </Stack>
  );
}

export default function HostOverviewTab({ host }: Readonly<{ host: HostDetail }>) {
  const { t } = useTranslation();
  const categories = host.host_categories ?? [];

  return (
    <Stack spacing={2}>
      <SectionCard icon={<BadgeIcon color="primary" />} title={t('directory.hostEditor.identity')}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.hostEditor.fullName')} value={host.full_name} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.hostEditor.email')} value={host.email} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.hostEditor.phone')} value={host.phone} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact
              label={t('directory.hostEditor.dob')}
              value={host.dob ? formatDateTime(host.dob) : ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Fact label={t('directory.hostEditor.address')} value={host.full_address} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Fact label={t('directory.hostEditor.tags')} value={(host.tags ?? []).join(', ')} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        icon={<FactCheckIcon color="primary" />}
        title={t('directory.hostEditor.verification')}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.hostEditor.aadhaar')} value={host.aadhar_number} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact label={t('directory.hostEditor.pan')} value={host.pan_number} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <DocLink
              label={t('directory.hostEditor.passportPhoto')}
              url={host.passport_photo_url}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <DocLink
              label={t('directory.hostEditor.policeVerification')}
              url={host.police_verification_url}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        icon={<CategoryIcon color="primary" />}
        title={t('directory.hostEditor.categories')}
      >
        {categories.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('directory.hostEditor.noCategories')}
          </Typography>
        ) : (
          <Stack spacing={1}>
            {categories.map((category) => (
              <Typography
                key={`${category.super_category_name}-${category.category_name}-${category.sub_category_name}`}
                variant="body2"
              >
                {[
                  category.super_category_name,
                  category.category_name,
                  category.sub_category_name,
                ]
                  .filter(Boolean)
                  .join(' › ')}
                {category.request_no ? ` · ${category.request_no}` : ''}
              </Typography>
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard
        icon={<AccountBalanceIcon color="primary" />}
        title={t('directory.venueEditor.payout')}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact
              label={t('directory.venueEditor.payoutMethod')}
              value={host.bank_account?.payout_method ?? ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Fact
              label={t('directory.venueEditor.accountHolder')}
              value={host.bank_account?.account_holder_name ?? ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Fact
              label={t('directory.venueEditor.accountNumber')}
              value={host.bank_account?.account_number ?? ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Fact
              label={t('directory.venueEditor.ifsc')}
              value={host.bank_account?.ifsc_code ?? ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Fact label={t('directory.venueEditor.upi')} value={host.bank_account?.upi_id ?? ''} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Fact
              label={t('directory.hostEditor.reviewerNotes')}
              value={host.reviewer_notes ?? ''}
            />
          </Grid>
        </Grid>
      </SectionCard>
    </Stack>
  );
}
