import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GroupsIcon from '@mui/icons-material/Groups';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import ContactsIcon from '@mui/icons-material/Contacts';
import { WA_LEAD_STATS, type WaLeadStats } from '../tools/whatsapp/whatsappQueries';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

const cards = (t: Translate): { key: keyof WaLeadStats; label: string; icon: React.ReactNode; color: string }[] =>[
  { key: 'total_leads', label: t('crm.common.totalLeads'), icon: <PersonSearchIcon />, color: '#0d9488' },
  { key: 'total_communities', label: t('crm.common.communities'), icon: <Diversity3Icon />, color: '#7c3aed' },
  { key: 'total_groups', label: t('crm.common.groups'), icon: <GroupsIcon />, color: '#2563eb' },
  { key: 'total_contacts', label: t('crm.common.contacts'), icon: <ContactsIcon />, color: '#db2777' },
];

/** Top-of-page dashboard counters. Refetches whenever `reloadKey` changes. */
export default function LeadStatsBar({ reloadKey }: Readonly<{ reloadKey: number }>) {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<{ waLeadStats: WaLeadStats }>(WA_LEAD_STATS, {
    fetchPolicy: 'cache-and-network',
  });
  useEffect(() => {
    refetch().catch(() => undefined);
  }, [reloadKey, refetch]);
  const stats = data?.waLeadStats;

  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {cards(t).map((c) => (
        <Grid
          key={c.key}
          size={{
            xs: 6,
            md: 3
          }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Stack direction="row" spacing={1.25} sx={{
                alignItems: "center"
              }}>
                <Stack
                  sx={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    color: '#fff',
                    bgcolor: c.color
                  }}>
                  {c.icon}
                </Stack>
                <div>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.1
                    }}>
                    {(stats?.[c.key] ?? 0).toLocaleString('en-IN')}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
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
