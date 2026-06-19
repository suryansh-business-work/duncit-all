import { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GroupsIcon from '@mui/icons-material/Groups';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ContactsIcon from '@mui/icons-material/Contacts';
import { WA_LEAD_STATS, type WaLeadStats } from '../tools/whatsapp/whatsappQueries';

const CARDS: { key: keyof WaLeadStats; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'total_leads', label: 'Total Leads', icon: <PersonSearchIcon />, color: '#0d9488' },
  { key: 'total_communities', label: 'Communities', icon: <Diversity3Icon />, color: '#7c3aed' },
  { key: 'total_groups', label: 'Groups', icon: <GroupsIcon />, color: '#2563eb' },
  { key: 'total_contacts', label: 'Contacts', icon: <ContactsIcon />, color: '#db2777' },
];

/** Top-of-page dashboard counters. Refetches whenever `reloadKey` changes. */
export default function LeadStatsBar({ reloadKey }: Readonly<{ reloadKey: number }>) {
  const { data, refetch } = useQuery<{ waLeadStats: WaLeadStats }>(WA_LEAD_STATS, {
    fetchPolicy: 'cache-and-network',
  });
  useEffect(() => {
    void refetch();
  }, [reloadKey, refetch]);
  const stats = data?.waLeadStats;

  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {CARDS.map((c) => (
        <Grid key={c.key} item xs={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  sx={{ width: 38, height: 38, borderRadius: 2, color: '#fff', bgcolor: c.color }}
                >
                  {c.icon}
                </Stack>
                <div>
                  <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                    {(stats?.[c.key] ?? 0).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.label}
                  </Typography>
                </div>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
