import { useState } from 'react';
import { Box, Button, Chip, Collapse, Stack, useMediaQuery, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { Ticket } from '../../../graphql/tickets';
import { TICKET_PRIORITY_COLORS, TICKET_STATUS_COLORS } from '../../../lib/statusMaps';
import TicketUserDetails from './TicketUserDetails';

/** Width of the desktop sidebar — wide enough for a user id, narrow enough to
 * leave the conversation the room it needs. */
const TICKET_INFO_WIDTH = 340;

/**
 * Everything about the ticket that is not the conversation: its state chips and
 * who raised it.
 *
 * This used to sit above the thread across the full width, which cost roughly a
 * third of the page height and left the agent reading their conversation
 * through a slot. On a desktop it is now a column beside the thread; on a
 * narrow screen, where there is no second column to give it, it folds away and
 * the thread keeps the height instead.
 */
export default function TicketInfoPanel({ ticket }: Readonly<{ ticket: Ticket }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = useState(false);

  const content = (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <StatusChip status={ticket.status} colorMap={TICKET_STATUS_COLORS} />
        <StatusChip
          status={ticket.priority}
          colorMap={TICKET_PRIORITY_COLORS}
          label={`${ticket.priority} priority`}
        />
        <Chip size="small" variant="outlined" label={ticket.category} />
      </Stack>
      <TicketUserDetails user={ticket.user} guestEmail={ticket.guest_email} />
    </Stack>
  );

  if (wide) {
    return (
      <Box
        sx={{
          width: TICKET_INFO_WIDTH,
          flexShrink: 0,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          pr: 0.5,
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box sx={{ flexShrink: 0 }}>
      <Button
        size="small"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        endIcon={
          <ExpandMoreIcon
            sx={{
              transform: open ? 'rotate(180deg)' : 'none',
              transition: theme.transitions.create('transform'),
            }}
          />
        }
      >
        {open ? t('support.ticketDetail.detailsHide') : t('support.ticketDetail.detailsShow')}
      </Button>
      <Collapse in={open}>
        <Box sx={{ pt: 1 }}>{content}</Box>
      </Collapse>
    </Box>
  );
}
