import { Box, Container, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Dot, Shape, SkeletonFrame, TextLine, slots } from './shapes';

const CARD = `${LITE_RADII.card}px`;
const CONTROL = `${LITE_RADII.control}px`;

/** A title, a line under it and a few panels: for a wait that does not know its page yet (a route still downloading). */
export function PageSkeleton() {
  return (
    <SkeletonFrame testId="page-skeleton">
      <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto' }}>
        <Stack spacing={0.5}>
          <TextLine width="40%" typo="h2" />
          <TextLine width="65%" />
        </Stack>
        <Shape height={140} radius={CARD} />
        <Shape height={140} radius={CARD} />
        <Shape height={96} radius={CARD} />
      </Stack>
    </SkeletonFrame>
  );
}

/** Before the site's settings arrive: the header bar (mark, name, places, account) over a page. */
export function ShellSkeleton() {
  return (
    <SkeletonFrame testId="shell-skeleton" sx={{ minHeight: '100dvh' }}>
      <Container maxWidth={false} sx={{ maxWidth: 1240 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minHeight: { xs: 56, md: 60 } }}>
          <Shape width={36} height={36} radius={CONTROL} />
          <TextLine width={100} />
          <Stack direction="row" spacing={2} sx={{ display: { xs: 'none', md: 'flex' }, pl: 2 }}>
            {slots('place', 4).map((place) => (
              <TextLine key={place} width={72} typo="body2" />
            ))}
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Dot size={32} />
        </Stack>
      </Container>
      <Container maxWidth={false} sx={{ maxWidth: 1040, py: { xs: 2, md: 4 } }}>
        <Stack spacing={3}>
          <TextLine width="35%" typo="h2" />
          <Shape height={180} radius={CARD} />
          <Shape height={120} radius={CARD} />
        </Stack>
      </Container>
    </SkeletonFrame>
  );
}

/** A settings form: a section title, its fields and the save button, twice. */
export function FormSkeleton() {
  return (
    <SkeletonFrame testId="form-skeleton">
      <Stack spacing={4}>
        {slots('section', 2).map((section) => (
          <Stack key={section} spacing={2}>
            <TextLine width="30%" typo="h4" />
            {slots(section, 3).map((field) => (
              <Shape key={field} height={56} radius={CONTROL} />
            ))}
            <Shape width={120} height={40} radius={CONTROL} />
          </Stack>
        ))}
      </Stack>
    </SkeletonFrame>
  );
}
