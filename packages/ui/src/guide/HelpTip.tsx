import type { ReactNode } from 'react';
import { Tooltip, type TooltipProps } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

export interface HelpTipProps {
  /** What the tooltip says — a sentence, or a small block of them. */
  title: ReactNode;
  /** The button's accessible name. Defaults to the shared "More about this". */
  label?: string;
  /** Size of the glyph; the button stays small so it sits inline beside a heading. Default 'small'. */
  size?: 'small' | 'medium';
  /** Default 'top'. */
  placement?: TooltipProps['placement'];
  /** Extra sx on the glyph — a colour, a nudge. */
  iconSx?: SxProps<Theme>;
}

/**
 * An info glyph that explains the thing beside it, on hover, on keyboard focus
 * and on the first tap (no touch delay).
 *
 * The accessible name is set on the BUTTON, not through the tooltip: MUI's
 * `Tooltip` writes `aria-label={title}` onto its child unless `describeChild`
 * is on, which would turn every help tip on a page into a button named after
 * its sentence. With `describeChild` the sentence becomes the description
 * (`aria-describedby`) while the tooltip is open, and the button keeps its
 * own name.
 */
export function HelpTip({ title, label, size = 'small', placement = 'top', iconSx }: Readonly<HelpTipProps>) {
  const { t } = useTranslation();
  return (
    <Tooltip title={title} placement={placement} enterTouchDelay={0} describeChild>
      <DuncitIconButton size="small" aria-label={label ?? t('ui.guide.helpTipLabel')} sx={{ verticalAlign: 'middle' }}>
        <InfoOutlinedIcon fontSize={size} sx={iconSx} />
      </DuncitIconButton>
    </Tooltip>
  );
}
