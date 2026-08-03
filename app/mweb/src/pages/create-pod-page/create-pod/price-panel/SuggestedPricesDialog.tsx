import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SellIcon from '@mui/icons-material/Sell';
import { SUGGESTED_TICKET_PRICES, type SuggestedTicketPrice } from './queries';
import SuggestedPricesTable from './SuggestedPricesTable';
import {
  SUGGESTED_PRICES_CLOSE,
  SUGGESTED_PRICES_EMPTY,
  SUGGESTED_PRICES_ERROR,
  SUGGESTED_PRICES_NOTE,
  SUGGESTED_PRICES_TITLE,
} from './pricingCopy';

interface Props {
  open: boolean;
  onClose: () => void;
  noOfSpots: number;
  venueId: string | null;
  venueAmount: number | null;
  symbol: string;
}

/**
 * "Suggested Ticket Prices" — the ₹x99 ladder with the host's projected payout
 * at each rung. Closes on the ✕, on a backdrop click and on Esc (both handled
 * by MUI's Dialog onClose). The ladder is fetched only while the modal is open.
 * Native twin (rule 27).
 */
export default function SuggestedPricesDialog({
  open,
  onClose,
  noOfSpots,
  venueId,
  venueAmount,
  symbol,
}: Readonly<Props>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { data, loading, error } = useQuery(SUGGESTED_TICKET_PRICES, {
    variables: { no_of_spots: noOfSpots, venue_id: venueId, venue_amount: venueAmount },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const prices: SuggestedTicketPrice[] = data?.suggestedTicketPrices ?? [];

  let body: ReactNode = <SuggestedPricesTable prices={prices} symbol={symbol} />;
  if (loading && prices.length === 0) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
        <CircularProgress size={22} data-testid="suggested-prices-loading" />
      </Box>
    );
  } else if (error) {
    body = (
      <Typography variant="body2" color="error" data-testid="suggested-prices-error">
        {SUGGESTED_PRICES_ERROR}
      </Typography>
    );
  } else if (prices.length === 0) {
    body = (
      <Typography variant="body2" color="text.secondary" data-testid="suggested-prices-empty">
        {SUGGESTED_PRICES_EMPTY}
      </Typography>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="suggested-prices-title"
      data-testid="suggested-prices-modal"
    >
      <DialogTitle
        id="suggested-prices-title"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, pr: 7 }}
      >
        <SellIcon color="primary" fontSize="small" />
        {SUGGESTED_PRICES_TITLE}
        <IconButton
          aria-label={SUGGESTED_PRICES_CLOSE}
          onClick={onClose}
          data-testid="suggested-prices-close"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {body}
          <Box
            data-testid="suggested-prices-note"
            sx={{ p: 1.5, borderRadius: '16px', bgcolor: alpha(theme.palette.primary.main, 0.1) }}
          >
            <Typography variant="body2" fontWeight={700}>
              {SUGGESTED_PRICES_NOTE}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
