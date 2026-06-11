import { gql, useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import 'react-quill/dist/quill.snow.css';
import PolicyPdfButton from './PolicyPdfButton';

const POLICY_BY_SLUG = gql`
  query PolicyBySlug($slug: String!) {
    policyBySlug(slug: $slug) {
      id
      slug
      title
      content
      is_active
      updated_at
    }
  }
`;

interface PolicyRendererProps {
  /** The unique policy slug as defined in the admin panel (e.g. "privacy-policy"). */
  slug: string;
  /** Hide the policy title — useful when embedding inside another page. */
  hideTitle?: boolean;
  /** Hide the "Last updated" footer. */
  hideUpdated?: boolean;
}

/**
 * Renders a policy by slug as a styled, full-width article.
 * Content is rich-text HTML produced by the admin's Quill editor.
 *
 * NOTE: HTML comes from a trusted admin-only authoring surface.
 */
export default function PolicyRenderer({ slug, hideTitle, hideUpdated }: Readonly<PolicyRendererProps>) {
  const { data, loading, error } = useQuery(POLICY_BY_SLUG, {
    variables: { slug },
    fetchPolicy: 'cache-and-network',
  });

  if (loading && !data) {
    return (
      <Stack spacing={1.5} sx={{ maxWidth: 880, mx: 'auto' }}>
        <Skeleton variant="text" width="60%" height={48} />
        <Skeleton variant="rectangular" height={20} />
        <Skeleton variant="rectangular" height={20} />
        <Skeleton variant="rectangular" height={20} width="80%" />
        <Skeleton variant="rectangular" height={120} />
      </Stack>
    );
  }
  if (error)
    return <Alert severity="error">Could not load policy: {error.message}</Alert>;

  const policy = data?.policyBySlug;
  if (!policy) {
    return (
      <Alert severity="warning">
        No policy found for slug <code>{slug}</code>.
      </Alert>
    );
  }
  if (!policy.is_active) {
    return (
      <Alert severity="info">
        This policy is currently hidden.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 880, mx: 'auto' }}>
      {!hideTitle && (
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
          {policy.title}
        </Typography>
      )}
      {!hideTitle && <PolicyPdfButton slug={slug} />}
      <Box
        className="ql-snow"
        sx={{
          // Render the HTML produced by Quill with its native styles for
          // headings, lists, blockquotes, code blocks, alignment etc.
          '& .ql-editor': { padding: 0 },
          '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
          '& a': { color: 'primary.main' },
          '& h1, & h2, & h3': { mt: 3, mb: 1.5, fontWeight: 700 },
          '& p': { mb: 1.25, lineHeight: 1.7 },
          '& ul, & ol': { pl: 3, mb: 1.5 },
          '& blockquote': {
            borderLeft: 4,
            borderColor: 'divider',
            pl: 2,
            color: 'text.secondary',
            my: 2,
          },
          '& pre': {
            bgcolor: 'action.hover',
            p: 2,
            borderRadius: 1,
            overflowX: 'auto',
            fontFamily: 'monospace',
          },
        }}
      >
        <Box className="ql-editor" dangerouslySetInnerHTML={{ __html: policy.content || '' }} />
      </Box>
      {!hideUpdated && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 4, display: 'block', textAlign: 'right' }}
        >
          Last updated {new Date(policy.updated_at).toLocaleDateString()}
        </Typography>
      )}
      {loading && (
        <Box sx={{ position: 'fixed', top: 80, right: 24 }}>
          <CircularProgress size={18} />
        </Box>
      )}
    </Box>
  );
}
