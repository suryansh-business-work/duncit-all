import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';

/** A 40px round surface button — the back button, and any right-hand action
 * that sits opposite it. */
export const ROUND_HEADER_BUTTON_SX = {
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
} as const;

interface Props {
  title: string;
  /** The back button's accessible name — each page keeps its own key. */
  backLabel: string;
  /** Optional right-hand action; the title centres when there is one. */
  action?: ReactNode;
}

/** The calm inner-page header: round back button · 17/600 title · optional
 * action. Shared by the waiting, attendance, pod-media and change-requests
 * pages; native twin: the StackScreen back bar (rule 27). */
export default function PageBackHeader({ title, backLabel, action }: Readonly<Props>) {
  const navigate = useNavigate();
  const textAlign = action ? 'center' : 'left';

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <DuncitRoundButton
        aria-label={backLabel}
        onClick={() => navigate(-1)}
        sx={ROUND_HEADER_BUTTON_SX}
      >
        <ArrowBackRoundedIcon />
      </DuncitRoundButton>
      <Typography
        component="h1"
        noWrap
        sx={{ flex: 1, minWidth: 0, fontSize: '1.0625rem', fontWeight: 600, textAlign }}
      >
        {title}
      </Typography>
      {action}
    </Stack>
  );
}
