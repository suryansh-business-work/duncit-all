import type { ReactNode } from 'react';
import { Stack, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { canMarkReportOk, canTakeDownReport, type ReportMailRecipient } from '@duncit/utils';
import type { ContentReport } from '../../../graphql/reports';

/** The two verdicts a reviewer can reach about reported content. */
export type ReportDecision = 'TAKE_DOWN' | 'LOOKS_GOOD';

/** What the queue does when a reviewer picks an action — one place, so the row
 * and the detail dialog cannot wire the same button two ways. */
export interface ReportActionHandlers {
  onOpen: (report: ContentReport) => void;
  onDecide: (report: ContentReport, decision: ReportDecision) => void;
  onMail: (report: ContentReport, recipient: ReportMailRecipient) => void;
}

interface ActionButtonProps {
  /** Names the report it acts on: the tooltip is the button's accessible name. */
  title: string;
  testId: string;
  icon: ReactNode;
  disabled?: boolean;
  color?: 'default' | 'error';
  onClick: () => void;
}

function ActionButton({
  title,
  testId,
  icon,
  disabled = false,
  color = 'default',
  onClick,
}: Readonly<ActionButtonProps>) {
  return (
    <Tooltip title={title}>
      {/* The span keeps the tooltip working while the button is disabled, so a
          reviewer can still read what the greyed-out control would have done. */}
      <span>
        <DuncitIconButton
          size="small"
          color={color}
          disabled={disabled}
          aria-label={title}
          data-testid={testId}
          onClick={onClick}
        >
          {icon}
        </DuncitIconButton>
      </span>
    </Tooltip>
  );
}

interface Props {
  report: ContentReport;
  handlers: ReportActionHandlers;
  /** The row offers Open too; the detail dialog is already the open report. */
  withOpen?: boolean;
}

/**
 * Everything a reviewer can do about one report: take the content down, rule
 * that it is fine, and write to either person involved.
 *
 * A verdict that no longer applies is disabled rather than hidden — a row whose
 * buttons come and go reads as a different row, and "why can't I take this
 * down?" is answered by the Content column beside it.
 */
export default function ReportRowActions({ report, handlers, withOpen = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const vars = { report_no: report.report_no };

  return (
    <Stack direction="row" spacing={0.25} component="span" data-testid={`report-actions-${report.id}`}>
      {withOpen && (
        <ActionButton
          title={t('reportLogs.openNamed', { vars })}
          testId={`report-open-${report.id}`}
          icon={<VisibilityIcon fontSize="small" />}
          onClick={() => handlers.onOpen(report)}
        />
      )}
      <ActionButton
        title={t('reportLogs.takeDownNamed', { vars })}
        testId={`report-take-down-${report.id}`}
        icon={<RemoveCircleOutlineIcon fontSize="small" />}
        color="error"
        disabled={!canTakeDownReport(report)}
        onClick={() => handlers.onDecide(report, 'TAKE_DOWN')}
      />
      <ActionButton
        title={t('reportLogs.looksGoodNamed', { vars })}
        testId={`report-looks-good-${report.id}`}
        icon={<TaskAltIcon fontSize="small" />}
        disabled={!canMarkReportOk(report)}
        onClick={() => handlers.onDecide(report, 'LOOKS_GOOD')}
      />
      <ActionButton
        title={t('reportLogs.mailReporterNamed', { vars })}
        testId={`report-mail-reporter-${report.id}`}
        icon={<ForwardToInboxIcon fontSize="small" />}
        onClick={() => handlers.onMail(report, 'REPORTER')}
      />
      <ActionButton
        title={t('reportLogs.mailOwnerNamed', { vars })}
        testId={`report-mail-owner-${report.id}`}
        icon={<ContactMailOutlinedIcon fontSize="small" />}
        onClick={() => handlers.onMail(report, 'OWNER')}
      />
    </Stack>
  );
}
