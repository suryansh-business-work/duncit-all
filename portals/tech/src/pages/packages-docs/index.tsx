import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import EmailSidebarList from '../../components/EmailSidebarList';
import FillViewport from '../../components/FillViewport';
import PackageDocBody from './PackageDocBody';
import PackageDocHeader from './PackageDocHeader';
import { DEFAULT_PACKAGE_SLUG, PACKAGE_DOCS } from './package-docs';

/**
 * Every shared package's documentation, inside the portal.
 *
 * It is reached from Emails because `@duncit/communication` is what every email
 * in the product goes through, and that is the doc most often wanted here — so
 * that one opens first. The rest are alongside it rather than in a second place:
 * there is one set of package docs, written next to each package, and this page
 * reads those files rather than keeping a copy of anything.
 */
export default function PackagesDocsPage() {
  const wanted = useSearchParams()[0].get('pkg');
  const [selected, setSelected] = useState(
    () => wanted ?? DEFAULT_PACKAGE_SLUG
  );

  const doc = PACKAGE_DOCS.find((p) => p.slug === selected) ?? PACKAGE_DOCS[0];

  return (
    <FillViewport>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Package Documentation
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Read from each package&apos;s own <code>docs/index.mdx</code>, so it says what the
          code says. {PACKAGE_DOCS.length} packages documented.
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <EmailSidebarList
          items={PACKAGE_DOCS.map((p) => ({
            key: p.slug,
            primary: p.name,
            secondary: p.category,
          }))}
          selected={doc?.slug ?? null}
          onSelect={setSelected}
          searchPlaceholder="Search package or category"
          emptyText="No packages documented."
          width={280}
        />

        {doc ? (
          <Paper
            variant="outlined"
            sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: 3 }}
          >
            <PackageDocHeader doc={doc} />
            <PackageDocBody markdown={doc.body} />
          </Paper>
        ) : (
          <Alert severity="info" sx={{ flex: 1 }}>
            No package docs were compiled into this build.
          </Alert>
        )}
      </Stack>
    </FillViewport>
  );
}
