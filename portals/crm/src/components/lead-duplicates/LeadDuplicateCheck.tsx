import { Alert, AlertTitle, Box, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useHref } from 'react-router';
import { useTranslation } from '@duncit/shell';
import type { CrmLeadEntityType } from '../../api/crm.types';
import type { CrmLeadDuplicateMatch } from '../../api/leadDuplicates.gql';
import { useLeadDuplicates } from '../../hooks/useLeadDuplicates';
import { LEAD_KIND_LABEL_KEY, leadDetailPath } from '../../lib/leadKinds';

const FIELD_LABEL_KEY: Record<CrmLeadDuplicateMatch['field'], string> = {
  PHONE: 'crm.duplicates.fieldPhone',
  EMAIL: 'crm.duplicates.fieldEmail',
  WEBSITE: 'crm.common.website',
};

interface Props {
  entityType: CrmLeadEntityType;
  /** The lead being edited; absent on a new lead. */
  leadId?: string;
}

/**
 * The lead forms' live duplicate warning. Lists each typed phone, email or
 * website another lead already has, names that lead and links to it. The
 * region is polite-live, so a screen reader hears the warning appear.
 */
export default function LeadDuplicateCheck({ entityType, leadId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { matches, checking, failed } = useLeadDuplicates(entityType, leadId);

  return (
    <Box aria-live="polite" data-testid="lead-duplicate-check">
      {matches.length > 0 && (
        <Alert severity="warning" data-testid="lead-duplicate-warning">
          <AlertTitle>{t('crm.duplicates.title')}</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {leadId ? t('crm.duplicates.introEdit') : t('crm.duplicates.intro')}
          </Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25 }}>
            {matches.map((match) => (
              <DuplicateMatchItem key={`${match.field}:${match.value}:${match.entity_type}:${match.lead_id}`} match={match} />
            ))}
          </Stack>
        </Alert>
      )}
      {matches.length === 0 && checking && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('crm.duplicates.checking')}
        </Typography>
      )}
      {failed && !checking && (
        <Alert severity="info" role="status" data-testid="lead-duplicate-failed">
          {t('crm.duplicates.checkFailed')}
        </Alert>
      )}
    </Box>
  );
}

function DuplicateMatchItem({ match }: Readonly<{ match: CrmLeadDuplicateMatch }>) {
  const { t } = useTranslation();
  const href = useHref(leadDetailPath(match.entity_type, match.lead_id));
  const name = match.lead_name || t('crm.duplicates.unnamed');
  const vars = { field: t(FIELD_LABEL_KEY[match.field]), value: match.value, kind: t(LEAD_KIND_LABEL_KEY[match.entity_type]), name };

  return (
    <Box component="li">
      <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
        {t('crm.duplicates.match', { vars })}
      </Typography>
      {match.city && (
        <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
          {' · '}
          {match.city}
        </Typography>
      )}{' '}
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('crm.duplicates.openLead', { vars: { name } })}
        sx={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
      >
        <OpenInNewIcon fontSize="inherit" />
      </Link>
    </Box>
  );
}
