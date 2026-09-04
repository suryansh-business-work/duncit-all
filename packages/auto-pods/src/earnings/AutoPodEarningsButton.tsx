import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { DuncitButton } from '@duncit/buttons';
import type { AutoPodLabels } from '@duncit/utils';

export interface AutoPodEarningsButtonProps {
  labels: AutoPodLabels;
  onClick: () => void;
}

/**
 * "View Potential Earnings" — the one control that opens a card's calculator,
 * written once so the venue's queue and the host's cannot drift on its wording
 * or its place under the card's details.
 */
export function AutoPodEarningsButton({ labels, onClick }: Readonly<AutoPodEarningsButtonProps>) {
  return (
    <DuncitButton
      size="small"
      variant="text"
      onClick={onClick}
      startIcon={<InsightsOutlinedIcon />}
      data-testid="auto-pod-view-earnings"
      sx={{ alignSelf: 'flex-start', px: 0.5 }}
    >
      {labels.viewEarningsCta}
    </DuncitButton>
  );
}
