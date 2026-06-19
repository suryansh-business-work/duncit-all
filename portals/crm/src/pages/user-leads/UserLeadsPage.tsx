import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import { WA_USER_LEADS } from '../tools/whatsapp/whatsappQueries';

/**
 * User Leads — people auto-imported from WhatsApp (communities/groups/contacts)
 * via the WhatsApp Lead Generator. Each row opens the lead detail page.
 */
export default function UserLeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, loading, error } = useQuery(WA_USER_LEADS, {
    variables: { search: search.trim() || null },
    fetchPolicy: 'cache-and-network',
  });
  const leads = data?.waUserLeads ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: 'auto' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <PersonSearchIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          User Leads
        </Typography>
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && leads.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : leads.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No user leads yet. Connect WhatsApp (Tools → WhatsApp Lead Generator) and
          Refresh to import communities, groups and contacts.
        </Alert>
      ) : (
        <List>
          {leads.map((lead: any) => (
            <ListItemButton
              key={lead.id}
              onClick={() => navigate(`/user-leads/${lead.id}`)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemText
                primary={lead.name || `+${lead.phone}`}
                secondary={`+${lead.phone}`}
              />
              <Stack direction="row" spacing={0.5}>
                {lead.source_groups?.length > 0 && (
                  <Chip size="small" label={`${lead.source_groups.length} groups`} />
                )}
                {lead.source_communities?.length > 0 && (
                  <Chip size="small" color="primary" variant="outlined" label={`${lead.source_communities.length} communities`} />
                )}
              </Stack>
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
