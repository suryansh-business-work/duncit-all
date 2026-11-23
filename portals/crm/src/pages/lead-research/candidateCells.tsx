import type { MouseEvent } from 'react';
import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { DuncitIconButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import ExternalLink from '../../components/ExternalLink';
import QualityScoreRing from '../../components/lead-quality/QualityScoreRing';
import { QUALIFICATION_COLOR, QUALIFICATION_KEY } from '../../components/lead-quality/qualityLabels';
import { CANDIDATE_STATUS_COLOR, CANDIDATE_STATUS_KEY, labelOf } from '../../lib/leadResearchLabels';

/** A link inside a row opens its page only; the row click (open the candidate) stays out of it. */
const keepRowClosed = (event: MouseEvent) => event.stopPropagation();

const CELL_STACK = { lineHeight: 1.2, minWidth: 0, py: 0.5 } as const;

/** The candidate's name with its Instagram profile under it. */
export function NameCell({ row }: Readonly<{ row: LeadCandidate }>) {
  const instagram = row.instagram_url || row.instagram_handle;
  return (
    <Stack component="span" sx={CELL_STACK}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 600 }} noWrap>
        {row.name}
      </Typography>
      {instagram ? (
        <ExternalLink href={instagram} variant="caption" onClick={keepRowClosed}>
          {row.instagram_handle ? `@${row.instagram_handle}` : instagram}
        </ExternalLink>
      ) : null}
    </Stack>
  );
}

/** The compact score ring with the classification beside it. */
export function ScoreCell({ row }: Readonly<{ row: LeadCandidate }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <QualityScoreRing score={row.score} tone={row.tone} label={row.classification_label} />
      <Typography variant="body2" component="span" noWrap>
        {row.classification_label || t('crm.leadQuality.notScored')}
      </Typography>
    </Stack>
  );
}

export function QualificationChip({ value }: Readonly<{ value: string }>) {
  const { t } = useTranslation();
  return <Chip size="small" variant="outlined" color={QUALIFICATION_COLOR[value] ?? 'default'} label={labelOf(t, QUALIFICATION_KEY, value)} />;
}

export function CandidateStatusChip({ value }: Readonly<{ value: string }>) {
  const { t } = useTranslation();
  return <Chip size="small" color={CANDIDATE_STATUS_COLOR[value] ?? 'default'} label={labelOf(t, CANDIDATE_STATUS_KEY, value)} />;
}

export function PlaceCell({ row }: Readonly<{ row: LeadCandidate }>) {
  return (
    <Stack component="span" sx={CELL_STACK}>
      <Typography variant="body2" component="span" noWrap>
        {row.city || EM_DASH}
      </Typography>
      {row.area ? (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }} noWrap>
          {row.area}
        </Typography>
      ) : null}
    </Stack>
  );
}

/** The first phone and email, with how many more there are. */
export function ContactsCell({ row }: Readonly<{ row: LeadCandidate }>) {
  const { t } = useTranslation();
  const [phone, ...otherPhones] = row.phones;
  const [email, ...otherEmails] = row.emails;
  const more = otherPhones.length + otherEmails.length;
  if (!phone && !email) return <>{EM_DASH}</>;
  return (
    <Stack component="span" sx={CELL_STACK}>
      {phone ? (
        <Typography variant="body2" component="span" noWrap>
          {phone}
        </Typography>
      ) : null}
      {email ? (
        <Typography variant="caption" component="span" noWrap>
          {email}
        </Typography>
      ) : null}
      {more > 0 ? (
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {t('crm.leadResearch.moreContacts', { count: more })}
        </Typography>
      ) : null}
    </Stack>
  );
}

/**
 * Opens the candidate. A row click does the same, but a grid row is not a
 * keyboard stop — this button is (WCAG 2.1.1). The tooltip text names the row,
 * and is also the button's accessible name.
 */
export function ReviewButton({ row, onOpen }: Readonly<{ row: LeadCandidate; onOpen: (row: LeadCandidate) => void }>) {
  const { t } = useTranslation();
  return (
    <Tooltip title={t('crm.leadResearch.reviewNamed', { vars: { name: row.name } })}>
      <DuncitIconButton
        size="small"
        color="primary"
        onClick={(event) => {
          keepRowClosed(event);
          onOpen(row);
        }}
        data-testid={`review-${row.id}`}
      >
        <RateReviewIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}

/** How many CRM leads this candidate matches. */
export function DuplicateCell({ row }: Readonly<{ row: LeadCandidate }>) {
  const { t } = useTranslation();
  if (row.duplicates.length === 0) return <>{EM_DASH}</>;
  return <Chip size="small" color="warning" label={t('crm.leadResearch.duplicateMatches', { count: row.duplicates.length })} />;
}
