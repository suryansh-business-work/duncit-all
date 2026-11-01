import type { ReactNode } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { PageHeader } from '@duncit/ui';
import type { PageCopy } from './page-copy';

interface Props {
  /** The page's heading, subtitle and standing note (how its numbers are counted), as translation keys. */
  copy: PageCopy;
  actions?: ReactNode;
  testId: string;
  children: ReactNode;
}

/** The frame every Product page shares: its heading, its controls, its note, then its body. */
export default function ProductPage({ copy, actions, testId, children }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} data-testid={testId}>
      <PageHeader title={t(copy.title)} subtitle={t(copy.subtitle)} actions={actions} />
      <Alert severity="info">{t(copy.note)}</Alert>
      {children}
    </Stack>
  );
}
