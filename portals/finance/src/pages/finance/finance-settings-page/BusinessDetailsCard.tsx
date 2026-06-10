import {
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

interface Props {
  currency: string;
  setCurrency: (v: string) => void;
  prefix: string;
  setPrefix: (v: string) => void;
  dummy: boolean;
  setDummy: (v: boolean) => void;
  bizName: string;
  setBizName: (v: string) => void;
  bizAddr: string;
  setBizAddr: (v: string) => void;
  bizGstin: string;
  setBizGstin: (v: string) => void;
}

export default function BusinessDetailsCard(p: Readonly<Props>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Business / Invoice details
        </Typography>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Currency symbol"
              value={p.currency}
              onChange={(e) => p.setCurrency(e.target.value)}
              sx={{ width: 160 }}
            />
            <TextField
              label="Invoice prefix"
              value={p.prefix}
              onChange={(e) => p.setPrefix(e.target.value)}
              sx={{ width: 200 }}
            />
            <FormControlLabel
              control={
                <Switch checked={p.dummy} onChange={(e) => p.setDummy(e.target.checked)} />
              }
              label="Dummy payment mode"
            />
          </Stack>
          <TextField
            label="Business legal name"
            value={p.bizName}
            onChange={(e) => p.setBizName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Business address"
            value={p.bizAddr}
            onChange={(e) => p.setBizAddr(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="GSTIN"
            value={p.bizGstin}
            onChange={(e) => p.setBizGstin(e.target.value)}
            fullWidth
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
