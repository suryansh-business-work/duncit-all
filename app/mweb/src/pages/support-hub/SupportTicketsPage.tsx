import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { HEADER_ME } from '../../components/app-header/queries';
import SupportForm, { type SupportFormValues } from '../../forms/support.form';
import SupportShell from './SupportShell';
import MyTicketsList from '../support-tickets/MyTicketsList';
import { CREATE_TICKET } from '../support-tickets/queries';
import { useTranslation } from '../../i18n/useTranslation';
import { SURFACE_SX } from '../../theme';

const ICON_DISC_SX = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: 'secondary.main',
  bgcolor: 'action.hover',
  flexShrink: 0,
} as const;

export default function SupportTicketsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { data: headerData } = useQuery<any>(HEADER_ME, { fetchPolicy: 'cache-first' });
  const me = headerData?.me;

  const initialValues = {
    name: me?.full_name || me?.first_name || '',
    email: me?.email || '',
    ...(params.get('category') ? { category: params.get('category')! } : {}),
    ...(params.get('subject') ? { subject: params.get('subject')! } : {}),
    ...(params.get('message') ? { message: params.get('message')! } : {}),
    ...(params.get('podId')
      ? { pod_id: params.get('podId')!, pod_title: params.get('podTitle') || '' }
      : {}),
  };

  // Refetch the ticket list so a freshly-created ticket shows up immediately in
  // "Your tickets" (the list is cache-first and would otherwise stay stale).
  const [createTicket, { loading }] = useMutation<any>(CREATE_TICKET, {
    refetchQueries: ['MyTickets'],
  });
  const [error, setError] = useState<string | null>(null);

  // The support form categories are user-friendly labels; the Ticket enum is
  // narrower — map what we can, default to OTHER.
  const TICKET_CATEGORY: Record<string, string> = {
    BUG: 'TECHNICAL',
    QUESTION: 'GENERAL',
    FEEDBACK: 'OTHER',
    ACCOUNT: 'GENERAL',
    PAYMENT: 'PAYMENT',
    OTHER: 'OTHER',
  };

  const handleSubmit = async (values: SupportFormValues) => {
    setError(null);
    try {
      const { data } = await createTicket({
        variables: {
          input: {
            subject: values.subject,
            category: TICKET_CATEGORY[values.category] ?? 'OTHER',
            body_text: values.message,
            attachments: values.attachments,
            ...(values.pod_id ? { pod_id: values.pod_id, pod_title: values.pod_title } : {}),
          },
        },
      });
      const id = data?.createTicket?.id;
      if (id) {
        // Straight to the ticket details page so the user can track it.
        navigate(`/tickets/${id}`);
      } else {
        setError(t('mweb.common.couldNotCreateTheTicketPlease'));
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error. Please try again.');
      throw e;
    }
  };

  return (
    <SupportShell title={t('mweb.common.createSupportTickets')} backTo="/support">
      <Stack spacing={2}>
        <Paper sx={{ ...SURFACE_SX, p: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={ICON_DISC_SX}>
              <SupportAgentIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600 }} noWrap>
                Help squad is ready
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Average reply within 24 hours
              </Typography>
            </Box>
            <Chip size="small" color="success" label={t('mweb.common.live')} />
          </Stack>
        </Paper>

        <Paper
          onClick={() => navigate('/faqs')}
          sx={{ ...SURFACE_SX, p: 2, cursor: 'pointer' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box sx={ICON_DISC_SX}>
              <HelpOutlineIcon fontSize="small" />
            </Box>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.9375rem', fontWeight: 600 }}>
              Maybe answered already?
            </Typography>
            <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
          </Stack>
        </Paper>

        <Paper sx={{ ...SURFACE_SX, p: 2 }}>
          <SupportForm
            loading={loading}
            errorMessage={error}
            initialValues={initialValues}
            onSubmit={handleSubmit}
          />
        </Paper>

        <MyTicketsList />
      </Stack>
    </SupportShell>
  );
}
