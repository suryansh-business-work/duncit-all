import { useState } from 'react';
import {
  Card,
  CardContent,
  Divider,
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
import { DuncitButton } from '@duncit/buttons';
import {
  ALL_STATUSES,
  PICKUP_FLOW,
  SHIP_FLOW,
  humaniseStatus,
  type FulfilmentStatus,
} from './constants';
import OrderShipmentSection from './OrderShipmentSection';
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

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography
          variant="subtitle1"
          component="h2"
          sx={{
            fontWeight: 700,
            mb: 1.5
          }}>
          {t('shell.nav.fulfilment')}
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={order.fulfilment_method}
          onChange={(_, value) => value && onSetMethod(value)}
          disabled={busy}
          aria-label={t('shell.nav.fulfilment')}
          data-testid="order-fulfilment-method"
        >
          <ToggleButton value="SHIP">{t('products.orders.ship')}</ToggleButton>
          <ToggleButton value="PICKUP">{t('products.orders.pickup')}</ToggleButton>
        </ToggleButtonGroup>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mt: 2.5 }}>
          {flow.map((step) => (
            <Step key={step}>
              <StepLabel>{humaniseStatus(step, t)}</StepLabel>
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
                {humaniseStatus(status, t)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t('products.orders.note')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <DuncitButton
            variant="contained"
            disabled={busy || target === order.fulfilment_status}
            onClick={() => onAdvance(target, note)}
          >
            {t('products.orders.updateStatus')}
          </DuncitButton>
        </Stack>

        {isShip && (
          <>
            <Divider sx={{ my: 2 }} />
            <OrderShipmentSection order={order} busy={busy} onCreateShipment={onCreateShipment} onRefreshTracking={onRefreshTracking} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
