import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import {
  loadPackageDemoSource,
  loadPackageDemos,
  type PackageDemoModule,
} from '@duncit/docs-demos';
import MonacoBlock from '../editor/MonacoBlock';
import DemoCard from './DemoCard';
import { useTranslation } from '@duncit/app-settings';

interface Loaded {
  module: PackageDemoModule | null;
  source: string;
}

/**
 * Every demo one package ships, with the file that produced them underneath.
 *
 * The source is the demo module itself, imported raw — not a copy written into
 * a string — so what a reader reads is provably what just ran. It is shown once
 * for the whole package rather than per demo, because that is how it is
 * written: one file, one import list, several examples out of it.
 */
export default function PackageDemos({ slug }: Readonly<{ slug: string }>) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState('');

  useEffect(() => {
    let active = true;
    setLoaded(null);
    setFailed('');
    Promise.all([loadPackageDemos(slug), loadPackageDemoSource(slug)])
      .then(([module, source]) => {
        if (active) setLoaded({ module, source });
      })
      .catch((e: unknown) => {
        if (active) setFailed(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (failed) {
    return (
      <Alert severity="error">
        {t('tech.packagesDocs.demosLoadFailed')} {failed}
      </Alert>
    );
  }
  if (!loaded) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }
  if (!loaded.module || loaded.module.demos.length === 0) {
    return (
      <Alert severity="info">
        {t('tech.packagesDocs.noDemoYet')}{' '}
        <code>packages/docs-demos/src/demos/{slug}.tsx</code>
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {loaded.module.demos.map((demo) => (
        <DemoCard key={demo.id} demo={demo} />
      ))}

      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('tech.packagesDocs.demoSource')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          <code>packages/docs-demos/src/demos/{slug}.tsx</code> — the file that just ran.
        </Typography>
        <MonacoBlock code={loaded.source} language="typescript" badge="tsx" />
      </Box>
    </Stack>
  );
}
