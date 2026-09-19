import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { DuncitIconButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { CATEGORY_LABEL } from '../copy';
import type { SocialCommentRow, SocialReviewStatus } from '../queries';

type Translate = (key: string) => string;

/** A status chip, or the dash when the AI has nothing to say yet. */
export function EnumChip({
  value,
  colors,
  labels,
  t,
}: Readonly<{ value: string | null; colors: StatusColorMap; labels: Record<string, string>; t: Translate }>) {
  if (!value) return <>{EM_DASH}</>;
  return <StatusChip status={value} colorMap={colors} label={t(labels[value])} />;
}

/** Why the AI flagged it: its sentence, and the reason codes as chips. */
export function ReasonCell({ row, t }: Readonly<{ row: SocialCommentRow; t: Translate }>) {
  if (!row.ai_reason && row.ai_categories.length === 0) return <>{EM_DASH}</>;
  return (
    <Stack spacing={0.5} sx={{ py: 0.5, minWidth: 0 }}>
      {row.ai_categories.length > 0 && (
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {row.ai_categories.map((code) => (
            <Chip key={code} size="small" variant="outlined" label={CATEGORY_LABEL[code] ? t(CATEGORY_LABEL[code]) : code} />
          ))}
        </Stack>
      )}
      {row.ai_reason && (
        <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'normal', lineHeight: 1.3 }}>
          {row.ai_reason}
        </Typography>
      )}
    </Stack>
  );
}

interface ReviewProps {
  row: SocialCommentRow;
  onReview: (row: SocialCommentRow, status: SocialReviewStatus) => Promise<void>;
  t: Translate;
}

/** Mark a comment as dealt with, or put it back in the queue. The tooltip is the name. */
export function ReviewToggle({ row, onReview, t }: Readonly<ReviewProps>) {
  if (row.review_status === 'REVIEWED') {
    return (
      <Tooltip title={t('marketing.social.reopen')}>
        <DuncitIconButton size="small" onClick={() => onReview(row, 'OPEN')} data-testid={`social-comment-reopen-${row.id}`}>
          <ReplayIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={t('marketing.social.markReviewed')}>
      <DuncitIconButton size="small" onClick={() => onReview(row, 'REVIEWED')} data-testid={`social-comment-review-${row.id}`}>
        <TaskAltIcon fontSize="small" />
      </DuncitIconButton>
    </Tooltip>
  );
}
