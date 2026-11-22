import type { MouseEvent, ReactNode } from 'react';
import { Stack, Tooltip } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { FailedPaymentDialogKind } from './useFailedPaymentActions';

interface ActionFlags {
  can_refund: boolean;
  needs_review: boolean;
  can_mark_not_refundable: boolean;
}

interface Props {
  flags: ActionFlags;
  /** False for a read-only seat (FINANCE_USER): no decision is offered at all. */
  canManage: boolean;
  onAction: (kind: FailedPaymentDialogKind) => void;
  /** Icon buttons in a table row; labelled buttons on the detail page. */
  variant?: 'icon' | 'button';
}

interface ActionDef {
  kind: FailedPaymentDialogKind;
  label: string;
  icon: ReactNode;
  color: 'success' | 'warning' | 'default';
  testId: string;
}

/**
 * The decisions a case is ready for, as icon buttons. Green rows refund, yellow
 * rows are reviewed, never-captured rows close as a bank reversal; a row ready
 * for none (or a viewer who may not act) shows nothing.
 */
export default function FailedPaymentRowActions({ flags, canManage, onAction, variant = 'icon' }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!canManage) return null;
  const actions: ActionDef[] = [];
  if (flags.can_refund) {
    actions.push({ kind: 'REFUND', label: t('finance.failedPayments.actionRefund'), icon: <UndoIcon fontSize="small" />, color: 'success', testId: 'failed-payment-action-refund' });
  }
  if (flags.needs_review) {
    actions.push({ kind: 'REVIEW', label: t('finance.failedPayments.actionReview'), icon: <RateReviewIcon fontSize="small" />, color: 'warning', testId: 'failed-payment-action-review' });
  }
  if (flags.can_mark_not_refundable) {
    actions.push({ kind: 'NOT_REFUNDABLE', label: t('finance.failedPayments.actionNotRefundable'), icon: <DoNotDisturbOnIcon fontSize="small" />, color: 'default', testId: 'failed-payment-action-not-refundable' });
  }
  if (actions.length === 0) return null;

  if (variant === 'button') {
    return (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <DuncitButton
            key={action.kind}
            variant="outlined"
            color={action.color === 'default' ? 'inherit' : action.color}
            startIcon={action.icon}
            data-testid={action.testId}
            onClick={() => onAction(action.kind)}
          >
            {action.label}
          </DuncitButton>
        ))}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} component="span">
      {actions.map((action) => (
        <Tooltip key={action.kind} title={action.label}>
          <DuncitIconButton
            size="small"
            color={action.color}
            aria-label={action.label}
            data-testid={action.testId}
            onClick={(event: MouseEvent) => {
              // A row click opens the case; a decision must not also navigate.
              event.stopPropagation();
              onAction(action.kind);
            }}
          >
            {action.icon}
          </DuncitIconButton>
        </Tooltip>
      ))}
    </Stack>
  );
}
