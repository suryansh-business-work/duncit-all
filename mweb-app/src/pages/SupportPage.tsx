import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { HEADER_DATA } from '../components/app-header/queries';
import SupportForm, { type SupportFormValues } from '../forms/support.form';

const SUBMIT_CONTACT = gql`
  mutation SubmitSupport($input: SubmitContactInput!) {
    submitContactForm(input: $input) {
      ok
      message
    }
  }
`;

export default function SupportPage() {
  const navigate = useNavigate();
  const { data: headerData } = useQuery(HEADER_DATA, { fetchPolicy: 'cache-first' });
  const me = headerData?.me;

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
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <SupportAgentIcon color="primary" />
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          Support
        </Typography>
      </Stack>

      <Alert severity="info" variant="outlined">
        Tell us what's going on. Our team will reach out via email — usually within 24 hours.
      </Alert>

      <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
            Send us a message
          </Typography>
        </Box>
        <SupportForm
          loading={loading}
          errorMessage={error}
          initialValues={{
            name: me?.full_name || me?.first_name || '',
            email: me?.email || '',
          }}
          onSubmit={handleSubmit}
        />
      </Paper>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
      >
        <Alert severity="success" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
