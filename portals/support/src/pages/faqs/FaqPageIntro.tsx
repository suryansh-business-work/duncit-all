import { Alert, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';

interface Props {
  /** The screen's heading. */
  title: string;
  /** One line saying what this set of answers is. */
  description: string;
  /** Where these answers actually surface, and what to do with them next. */
  hint: string;
}

/**
 * The heading block every FAQ screen in this portal opens with.
 *
 * All three author one collection for three different audiences, and from the
 * table alone they look identical — so the line saying where the answers
 * surface is part of the header rather than optional decoration per page.
 */
export default function FaqPageIntro({ title, description, hint }: Readonly<Props>) {
  return (
    <Stack spacing={1.5}>
      <PageHeader title={title} subtitle={description} />
      <Alert severity="info" variant="outlined">
        {hint}
      </Alert>
    </Stack>
  );
}
