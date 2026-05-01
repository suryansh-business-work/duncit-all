import { type ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  features?: string[];
}

export default function FinancePlaceholder({ icon, title, description, features = [] }: Props) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Chip
          icon={<ConstructionIcon sx={{ fontSize: 16 }} />}
          label="In development"
          color="warning"
          variant="outlined"
        />
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Planned capabilities
          </Typography>
          {features.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              This module is being scoped. Detailed UI and integrations will appear here once data
              models are finalized.
            </Typography>
          ) : (
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 3 }}>
              {features.map((f) => (
                <Typography key={f} component="li" variant="body2" color="text.secondary">
                  {f}
                </Typography>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
