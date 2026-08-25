import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import {
  ALL_STATUSES,
  PICKUP_FLOW,
  SHIP_FLOW,
  humaniseStatus,
  type FulfilmentStatus,
} from './constants';
import { useTranslation } from '@duncit/shell';

interface Props {
  order: any;
  busy: boolean;
  onSetMethod: (method: 'SHIP' | 'PICKUP') => void;
  onAdvance: (status: FulfilmentStatus, note: string) => void;
  onCreateShipment: () => void;
  onRefreshTracking: () => void;
}

export default function OrderFulfilmentPanel({
  order,
  busy,
  onSetMethod,
  onAdvance,
  onCreateShipment,
  onRefreshTracking,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<FulfilmentStatus>(order.fulfilment_status);
  const [note, setNote] = useState('');
  const isShip = order.fulfilment_method === 'SHIP';
  const flow = isShip ? SHIP_FLOW : PICKUP_FLOW;
  const activeStep = flow.indexOf(order.fulfilment_status);
  const shiprocket = order.shiprocket ?? {};

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          Fulfilment
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={order.fulfilment_method}
          onChange={(_, value) => value && onSetMethod(value)}
          disabled={busy}
        >
          <ToggleButton value="SHIP">Ship</ToggleButton>
          <ToggleButton value="PICKUP">{t('products.orders.pickup')}</ToggleButton>
        </ToggleButtonGroup>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 2.5 }}>
          {flow.map((step) => (
            <Step key={step}>
              <StepLabel>{humaniseStatus(step)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          <TextField
            select
            size="small"
            label={t('products.orders.setStatusTo')}
            value={target}
            onChange={(event) => setTarget(event.target.value as FulfilmentStatus)}
          >
            {ALL_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {humaniseStatus(status)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t('products.orders.note')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={busy || target === order.fulfilment_status}
            onClick={() => onAdvance(target, note)}
          >
            Update status
          </Button>
        </Stack>

        {isShip && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} useFlexGap sx={{
                flexWrap: "wrap"
              }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LocalShippingIcon />}
                  disabled={busy}
                  onClick={onCreateShipment}
                >
                  {shiprocket.awb ? 'Recreate shipment' : 'Create shipment'}
                </Button>
                <Button size="small" startIcon={<SyncIcon />} disabled={busy || !shiprocket.awb} onClick={onRefreshTracking}>
                  Sync tracking
                </Button>
              </Stack>
              {shiprocket.awb ? (
                <Box>
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    <Chip size="small" label={`AWB ${shiprocket.awb}`} />
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>
                      {shiprocket.courier_name || 'Courier pending'}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block",
                      mt: 0.5
                    }}>
                    {shiprocket.tracking_status || 'Awaiting first scan'}
                  </Typography>
                  {shiprocket.label_url && (
                    <Link href={shiprocket.label_url} target="_blank" rel="noopener" variant="body2">
                      Download shipping label
                    </Link>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  No shipment created yet.
                </Typography>
              )}
            </Stack>
          </>
        )}

        {order.last_error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {order.last_error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
