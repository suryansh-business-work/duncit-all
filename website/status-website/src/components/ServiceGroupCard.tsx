import { Box, List, Paper, Typography } from '@mui/material';
import ServiceRow from './ServiceRow';
import type { ServiceGroup, StatusService, SummaryResponse } from '../types';

interface GroupProps {
  group: ServiceGroup;
  summary: SummaryResponse | null;
  onSelect: (service: StatusService) => void;
}

export default function ServiceGroupCard({ group, summary, onSelect }: Readonly<GroupProps>) {
  return (
    <Box component="section" mb={4}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: '0.12em', fontWeight: 700 }}
      >
        {group.title}
      </Typography>
      <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
        <List disablePadding>
          {group.items.map((service, index) => (
            <ServiceRow
              key={service.key}
              service={service}
              summary={summary?.services[service.key] ?? null}
              divider={index < group.items.length - 1}
              onSelect={onSelect}
            />
          ))}
        </List>
      </Paper>
    </Box>
  );
}
