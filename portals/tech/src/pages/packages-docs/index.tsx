import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import EmailSidebarList from '../../components/EmailSidebarList';
import FillViewport from '../../components/FillViewport';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import PackageDocBody from './PackageDocBody';
import PackageDocHeader from './PackageDocHeader';
import PackageDemos from './demos/PackageDemos';
import { PACKAGE_DOCS } from './package-docs';
import { useTranslation } from '@duncit/app-settings';

/** Prose, and the same package actually running. Selection lives in the URL. */
const VIEW_VALUES = ['docs', 'demos'] as const;
type ViewValue = (typeof VIEW_VALUES)[number];

/**
 * Every shared package's documentation, inside the portal.
 *
 * One set of package docs, written next to each package, read from those files
 * rather than kept as a copy here — a second copy would be wrong within a week,
 * and the whole reason those files sit beside their package is that they move
 * with it.
 */
export default function PackagesDocsPage() {
  const { t } = useTranslation();
  // `?pkg=` opens a named package; otherwise the first one, because a general
  // index has no package it should privilege — the list and its search are
  // right there, and picking a favourite would only be a guess.
  const wanted = useSearchParams()[0].get('pkg');
  const [selected, setSelected] = useState(() => wanted ?? PACKAGE_DOCS[0]?.slug ?? '');
  const views = VIEW_VALUES.map((value) => ({
    value,
    label: value === 'docs' ? t('tech.packagesDocs.viewDocs') : t('tech.packagesDocs.viewDemos'),
  }));
  const view = useTabParam<ViewValue>({ items: views, fallback: 'docs' });

  const doc = PACKAGE_DOCS.find((p) => p.slug === selected) ?? PACKAGE_DOCS[0];

  return (
    <FillViewport>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          Package Documentation
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Read from each package&apos;s own <code>docs/index.mdx</code>, so it says what the
          code says — and every package runs, on mock data you can edit.{' '}
          {PACKAGE_DOCS.length} packages documented.
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
          emptyText={t('tech.packagesDocs.noPackagesDocumented')}
          width={280}
        />

        {doc ? (
          <Paper
            variant="outlined"
            sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: 3 }}
          >
            <PackageDocHeader doc={doc} />
            <DuncitTabs {...view} sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }} />
            <Box sx={{ mt: 2 }}>
              {view.value === 'docs' ? (
                <PackageDocBody markdown={doc.body} />
              ) : (
                <PackageDemos slug={doc.slug} />
              )}
            </Box>
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
