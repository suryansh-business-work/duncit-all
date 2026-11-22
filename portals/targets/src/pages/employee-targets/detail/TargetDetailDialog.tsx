import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard, StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import {
  EMPLOYEE_TARGET_STATUS_COLORS,
  EMPLOYEE_TARGET_STATUS_KEYS,
  canEditTargetGoals,
  formatMonthKey,
  type EmployeeTargetRecord,
} from '@duncit/utils';
import { ReviewTargetForm, type ReviewTargetFormValues } from '../review-target';
import TargetGoalList from './TargetGoalList';
import TargetSubmissionCard from './TargetSubmissionCard';

interface Props {
  target: EmployeeTargetRecord | null;
  onClose: () => void;
  onEdit: (target: EmployeeTargetRecord) => void;
  onReview: (target: EmployeeTargetRecord, values: ReviewTargetFormValues) => Promise<boolean>;
  onReopen: (target: EmployeeTargetRecord) => void;
  onDelete: (target: EmployeeTargetRecord) => void;
}

/**
 * One assignment in full: the goals, what the employee reported against them,
 * and the review — with the action the record's state allows: edit goals before
 * a report, review a submitted report, reopen a reviewed one.
 */
export default function TargetDetailDialog({ target, onClose, onEdit, onReview, onReopen, onDelete }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  if (!target) return null;
  const { review } = target;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen} aria-labelledby="target-detail-title">
      <DialogTitle id="target-detail-title">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{t('employeeTargets.detail.title', { vars: { name: target.employee.name, month: formatMonthKey(target.month, locale) } })}</span>
          <StatusChip status={target.status} colorMap={EMPLOYEE_TARGET_STATUS_COLORS} label={t(EMPLOYEE_TARGET_STATUS_KEYS[target.status])} />
        </Stack>
        <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
          {t('employeeTargets.detail.assignedBy', { vars: { name: target.assigned_by.name, date: formatDateTime(target.created_at) } })}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} data-testid="target-detail">
          <SectionCard title={t('employeeTargets.goals.title')}>
            <TargetGoalList goals={target.goals} notes={target.notes} />
          </SectionCard>
          <SectionCard title={t('employeeTargets.submission.title')}>
            <TargetSubmissionCard submission={target.submission} />
          </SectionCard>
          {review && (
            <SectionCard title={t('employeeTargets.review.title')}>
              <Alert severity="success" data-testid="target-review">
                {t('employeeTargets.review.reviewedBy', {
                  vars: { name: review.reviewed_by.name, date: formatDateTime(review.reviewed_at) },
                })}
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 0.5 }}>
                  {review.comment || t('employeeTargets.review.noComment')}
                </Typography>
              </Alert>
            </SectionCard>
          )}
          {target.status === 'SUBMITTED' && (
            <SectionCard title={t('employeeTargets.review.title')}>
              <ReviewTargetForm onSubmit={(values) => onReview(target, values)} />
            </SectionCard>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <DuncitButton color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onDelete(target)} data-testid="target-detail-delete">
          {t('employeeTargets.admin.delete')}
        </DuncitButton>
        {canEditTargetGoals(target.status) && (
          <DuncitButton startIcon={<EditIcon />} onClick={() => onEdit(target)} data-testid="target-detail-edit">
            {t('employeeTargets.admin.editGoals')}
          </DuncitButton>
        )}
        {target.status === 'REVIEWED' && (
          <DuncitButton startIcon={<ReplayIcon />} onClick={() => onReopen(target)} data-testid="target-detail-reopen">
            {t('employeeTargets.admin.reopen')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose} data-testid="target-detail-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
