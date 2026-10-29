import { Stack, Tooltip } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { HealthAppeal } from '../../graphql/healthAppeals';
import type { AppealDecision } from './appeal-decision-form';

interface Props {
  appeal: HealthAppeal;
  onDecide: (appeal: HealthAppeal, decision: AppealDecision) => void;
}

/**
 * Accept or deny one appeal. Both are disabled rather than hidden once it is
 * decided — a row whose buttons come and go reads as a different row, and the
 * Status column beside it says why. Each tooltip names the appeal, because it
 * is the button's accessible name.
 */
export default function HealthAppealRowActions({ appeal, onDecide }: Readonly<Props>) {
  const { t } = useTranslation();
  const vars = { appeal_no: appeal.appeal_no };
  const decided = appeal.status !== 'PENDING';

  return (
    <Stack direction="row" spacing={0.25} component="span" data-testid={`appeal-actions-${appeal.id}`}>
      <Tooltip title={t('healthAppeals.acceptNamed', { vars })}>
        {/* The span keeps the tooltip working while the button is disabled. */}
        <span>
          <DuncitIconButton
            size="small"
            color="success"
            disabled={decided}
            aria-label={t('healthAppeals.acceptNamed', { vars })}
            data-testid={`appeal-accept-${appeal.id}`}
            onClick={() => onDecide(appeal, 'ACCEPT')}
          >
            <TaskAltIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('healthAppeals.denyNamed', { vars })}>
        <span>
          <DuncitIconButton
            size="small"
            color="error"
            disabled={decided}
            aria-label={t('healthAppeals.denyNamed', { vars })}
            data-testid={`appeal-deny-${appeal.id}`}
            onClick={() => onDecide(appeal, 'DENY')}
          >
            <DoNotDisturbOnOutlinedIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
