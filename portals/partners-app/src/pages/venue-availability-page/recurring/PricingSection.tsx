import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { WEEKDAY_FULL } from './settings-map';

interface Props {
  defaultPrice: string;
  onDefaultPrice: (value: string) => void;
  weekdays: number[];
  perDayPrice: Record<number, string>;
  onPerDayPrice: (next: Record<number, string>) => void;
}

export default function PricingSection({
  defaultPrice,
  onDefaultPrice,
  weekdays,
  perDayPrice,
  onPerDayPrice,
}: Readonly<Props>) {
  const entries = Object.keys(perDayPrice)
    .map(Number)
    .filter((d) => weekdays.includes(d))
    .sort((a, b) => a - b);
  const [differentPricing, setDifferentPricing] = useState(entries.length > 0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const available = weekdays.filter((d) => !(d in perDayPrice)).sort((a, b) => a - b);

  const setDayPrice = (day: number, value: string) => onPerDayPrice({ ...perDayPrice, [day]: value });
  const removeDay = (day: number) => {
    const next = { ...perDayPrice };
    delete next[day];
    onPerDayPrice(next);
  };
  const toggleDifferent = (on: boolean) => {
    setDifferentPricing(on);
    if (!on) onPerDayPrice({});
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>
        Pricing
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
        <TextField
          label="Default price (₹)"
          type="number"
          size="small"
          value={defaultPrice}
          onChange={(e) => onDefaultPrice(e.target.value)}
          inputProps={{ min: 0, step: 50 }}
          sx={{ maxWidth: 200 }}
        />
        <Box sx={{ flex: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={differentPricing}
                onChange={(e) => toggleDifferent(e.target.checked)}
              />
            }
            label="Different price for selected days"
          />
          {differentPricing && (
            <Stack spacing={1} sx={{ mt: 0.5 }}>
              {entries.map((day) => (
                <Stack key={day} direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" sx={{ width: 96, fontWeight: 700 }}>
                    {WEEKDAY_FULL[day]}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={perDayPrice[day]}
                    onChange={(e) => setDayPrice(day, e.target.value)}
                    inputProps={{ min: 0, step: 50, 'aria-label': `${WEEKDAY_FULL[day]} price` }}
                    sx={{ maxWidth: 140 }}
                  />
                  <IconButton size="small" aria-label={`Remove ${WEEKDAY_FULL[day]} price`} onClick={() => removeDay(day)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={available.length === 0}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  Add another day
                </Button>
                <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                  {available.map((day) => (
                    <MenuItem
                      key={day}
                      onClick={() => {
                        setDayPrice(day, defaultPrice);
                        setMenuAnchor(null);
                      }}
                    >
                      {WEEKDAY_FULL[day]}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
              <Typography variant="caption" color="text.secondary">
                This price applies to all selected days except the days you customise.
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
