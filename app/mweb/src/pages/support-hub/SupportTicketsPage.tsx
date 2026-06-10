import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Chip, Paper, Snackbar, Stack, Typography } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { HEADER_DATA } from '../../components/app-header/queries';
import SupportForm, { type SupportFormValues } from '../../forms/support.form';
import SupportShell from './SupportShell';

const SUBMIT_CONTACT = gql`
  mutation SubmitSupport($input: SubmitContactInput!) {
    submitContactForm(input: $input) {
      ok
      message
    }
  }
`;

export default function SupportTicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { data: headerData } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-first' });
  const me = headerData?.me;

  const initialValues = {
    name: me?.full_name || me?.first_name || '',
    email: me?.email || '',
    ...(params.get('category') ? { category: params.get('category')! } : {}),
    ...(params.get('subject') ? { subject: params.get('subject')! } : {}),
    ...(params.get('message') ? { message: params.get('message')! } : {}),
  };

  const [submit, { loading }] = useMutation(SUBMIT_CONTACT);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const handleSubmit = async (values: SupportFormValues) => {
    setError(null);
    const subjectTagged = `[${values.category}] ${values.subject}`;
    try {
      const { data } = await submit({
        variables: {
          input: {
            name: values.name,
            email: values.email,
            subject: subjectTagged,
            message: values.message,
            attachments: values.attachments,
          },
        },
      });
      if (data?.submitContactForm?.ok) {
        setSnack(data.submitContactForm.message ?? 'Sent. We will get back to you soon.');
      } else {
        setError(data?.submitContactForm?.message ?? 'Could not submit. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error. Please try again.');
      throw e;
    }
  };

  return (
    <SupportShell
      title="Support Tickets"
      subtitle="Raise an issue with our team"
      icon={<ConfirmationNumberIcon fontSize="small" />}
      backTo="/support"
    >
      <Stack spacing={2.25}>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 4, bgcolor: 'rgba(255,79,115,0.12)' }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 950 }} noWrap>
                Help squad is ready
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                Average reply within 24 hours
              </Typography>
            </Box>
            <Chip size="small" color="success" label="Live" sx={{ fontWeight: 900 }} />
          </Stack>
        </Paper>

        <Paper
          onClick={() => navigate('/faqs')}
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 4,
            bgcolor: 'rgba(20,184,166,0.10)',
            borderColor: 'rgba(20,184,166,0.24)',
            cursor: 'pointer',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <HelpOutlineIcon color="success" />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                Maybe answered already?
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tap to read quick answers before sending a ticket.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 950 }}>
              Tell us what's going on
            </Typography>
            <Typography variant="body2" color="text.secondary">
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

        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)}>
          <Alert severity="success" onClose={() => setSnack(null)}>
            {snack}
          </Alert>
        </Snackbar>
      </Stack>
    </SupportShell>
  );
}
