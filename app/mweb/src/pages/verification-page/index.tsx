import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import {
  MY_VERIFICATIONS,
  STATUS_META,
  SUBMIT_VERIFICATION,
  VERIFICATION_LABELS,
  type Verification,
} from './queries';

/** Verification — the user uploads a document for each of the 7 verification
 * types; an admin then approves/rejects them in the admin panel (B2-#9). */
export default function VerificationPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(MY_VERIFICATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [submit] = useMutation(SUBMIT_VERIFICATION);
  const [picking, setPicking] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const upload = async (type: string, url: string) => {
    setPicking(null);
    try {
      await submit({ variables: { type, document_url: url } });
      setSnack('Document submitted for review.');
      await refetch();
    } catch (e: any) {
      setSnack(e?.message ?? 'Could not submit the document.');
    }
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const verifications: Verification[] = data?.myVerifications ?? [];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', width: '100%', pb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate(-1)} aria-label="Go back" sx={{ minWidth: 44, minHeight: 44 }}>
          <ArrowBackIcon />
        </IconButton>
        <VerifiedUserIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={950} lineHeight={1}>
            Verification
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={800}>
            Upload documents to verify your account
          </Typography>
        </Box>
      </Stack>

      {verifications.map((item) => {
        const meta = STATUS_META[item.status];
        const verified = item.status === 'APPROVED';
        return (
          <Card key={item.type} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CheckCircleIcon
                  sx={{ color: verified ? 'success.main' : 'action.disabled' }}
                  aria-hidden
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={900}>
                    {VERIFICATION_LABELS[item.type] ?? item.type}
                  </Typography>
                  <Chip size="small" label={meta.label} color={meta.color} sx={{ mt: 0.5, fontWeight: 800 }} />
                  {item.status === 'REJECTED' && item.reject_reason && (
                    <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5 }}>
                      {item.reject_reason}
                    </Typography>
                  )}
                </Box>
                {!verified && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => setPicking(item.type)}
                    sx={{ borderRadius: 999, fontWeight: 900, flex: '0 0 auto' }}
                  >
                    {item.status === 'NOT_SUBMITTED' ? 'Upload' : 'Re-upload'}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      <MediaPickerDialog
        open={!!picking}
        onClose={() => setPicking(null)}
        folder="/verifications"
        title="Upload document"
        onPicked={(url: string) => {
          if (picking) upload(picking, url).catch(() => undefined);
        }}
      />
      {snack && (
        <Alert severity="info" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      )}
    </Stack>
  );
}
