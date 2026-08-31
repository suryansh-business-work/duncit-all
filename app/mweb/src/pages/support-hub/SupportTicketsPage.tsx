import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Box, Chip, Paper, Stack, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { HEADER_DATA } from '../../components/app-header/queries';
import SupportForm, { type SupportFormValues } from '../../forms/support.form';
import SupportShell from './SupportShell';
import MyTicketsList from '../support-tickets/MyTicketsList';
import { CREATE_TICKET } from '../support-tickets/queries';
import { useTranslation } from '../../i18n/useTranslation';


export default function SupportTicketsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { data: headerData } = useQuery<any>(HEADER_DATA, { fetchPolicy: 'cache-first' });
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
    <SupportShell
      title={t('mweb.common.createSupportTickets')}
      subtitle={t('mweb.supportHub.raiseAnIssueWithOurTeam')}
      icon={<ConfirmationNumberIcon fontSize="small" />}
      backTo="/support"
    >
      <Stack spacing={2.25}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,79,115,0.12)' }}>
          <Stack direction="row" spacing={1.25} sx={{
            alignItems: "center"
          }}>
            <Stack direction="row" spacing={-1} sx={{ flex: '0 0 auto' }}>
              {['primary.main', 'secondary.main', 'info.main'].map((color) => (
                <Avatar
                  key={color}
                  sx={{ width: 34, height: 34, bgcolor: color, border: 2, borderColor: 'background.paper' }}
                >
                  <SupportAgentIcon fontSize="small" />
                </Avatar>
              ))}
            </Stack>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                Help squad is ready
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600
                }}>
                Average reply within 24 hours
              </Typography>
            </Box>
            <Chip size="small" color="success" label={t('mweb.common.live')} sx={{ fontWeight: 700 }} />
          </Stack>
        </Paper>

        <Paper
          onClick={() => navigate('/faqs')}
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: '16px',
            bgcolor: 'rgba(20,184,166,0.10)',
            borderColor: 'rgba(20,184,166,0.24)',
            cursor: 'pointer',
          }}
        >
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <HelpOutlineIcon color="success" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Maybe answered already?
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                Tap to read quick answers before sending a ticket.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
          <Box sx={{ mb: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              Tell us what's going on
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Add the steps, screenshots, and expected result so we can fix it faster.
            </Typography>
          </Box>
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
