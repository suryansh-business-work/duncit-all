import {
  Avatar,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { InfoRow } from '@duncit/ui';

interface Props {
  order: any;
  podDateTime?: string;
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return <InfoRow label={label} value={value || '—'} labelWeight={400} valueWeight={600} />;
}

export default function OrderSummaryCard({ order, podDateTime }: Readonly<Props>) {
  const address = order.shipping_address;
  const symbol = order.currency_symbol;
  const addressText = address
    ? [address.line1, address.line2, address.city, address.state, address.pincode, address.country]
        .filter(Boolean)
        .join(', ')
    : 'Pickup order — no shipping address';
  const phoneSuffix = order.buyer_phone ? ` · ${order.buyer_phone}` : '';
  const contactText = `${order.buyer_email}${phoneSuffix}`;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Field label="Buyer" value={order.buyer_name} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Contact" value={contactText} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Pod" value={order.pod?.pod_title ?? '—'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Pod date" value={podDateTime ?? '—'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Payment ref" value={order.payment_ref} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Field label="Ship to" value={addressText} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Item</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Unit</TableCell>
              <TableCell align="right">Gross</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.line_items.map((item: any) => (
              <TableRow key={item.product_id}>
                <TableCell sx={{ width: 48 }}>
                  <Avatar src={item.image_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
                    {item.name?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.sku} · {item.ownership === 'DUNCIT' ? 'Duncit' : 'Brand'}
                  </Typography>
                </TableCell>
                <TableCell align="right">{item.qty}</TableCell>
                <TableCell align="right">
                  {symbol}
                  {item.unit_cost}
                </TableCell>
                <TableCell align="right">
                  {symbol}
                  {item.gross}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack spacing={0.5} sx={{ mt: 1.5 }} alignItems="flex-end">
          <Typography variant="body2" color="text.secondary">
            Items: {symbol}
            {order.items_total}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shipping: {symbol}
            {order.shipping_charge}
          </Typography>
          <Typography variant="subtitle1" fontWeight={800}>
            Total: {symbol}
            {order.total}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
