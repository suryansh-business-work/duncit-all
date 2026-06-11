import { useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { Button, Snackbar, Stack } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';

const POLICY_PDF = gql`
  query PolicyPdf($slug: String!) {
    policyPdfBase64(slug: $slug)
  }
`;

function base64ToBlobUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

/** "View PDF" + "Download PDF" actions for a policy — fetches the rendered PDF
 * from the server on demand so users can zoom, share or save it. */
export default function PolicyPdfButton({ slug }: Readonly<{ slug: string }>) {
  const [error, setError] = useState('');
  const [fetchPdf, { loading }] = useLazyQuery<{ policyPdfBase64: string }>(POLICY_PDF);

  const getUrl = async (): Promise<string | null> => {
    try {
      const { data } = await fetchPdf({ variables: { slug } });
      const base64 = data?.policyPdfBase64;
      if (!base64) {
        setError('Could not prepare the PDF. Please try again.');
        return null;
      }
      return base64ToBlobUrl(base64);
    } catch (e: any) {
      setError(e?.message ?? 'Could not prepare the PDF.');
      return null;
    }
  };

  const view = async () => {
    const url = await getUrl();
    if (url) window.open(url, '_blank', 'noreferrer');
  };

  const download = async () => {
    const url = await getUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.pdf`;
    a.click();
  };

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={view} disabled={loading}>
        View PDF
      </Button>
      <Button size="small" variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={loading}>
        Download PDF
      </Button>
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')} message={error} />
    </Stack>
  );
}
