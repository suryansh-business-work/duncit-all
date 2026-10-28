import { Stack } from '@mui/material';
import { SkeletonFrame, TextLine, slots } from '../../components/skeletons';

/** Line widths of one paragraph, so the page reads like ragged text rather than a block. */
const PARAGRAPH = ['100%', '96%', '98%', '64%'] as const;

/** A policy while it loads: the big title and its date over a few headed paragraphs. */
export function PolicySkeleton() {
  return (
    <SkeletonFrame testId="policy-skeleton" sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack spacing={3}>
        <Stack spacing={0.75} sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextLine width="65%" typo="h1" />
          <TextLine width="30%" />
        </Stack>
        {slots('section', 3).map((section) => (
          <Stack key={section} spacing={0.5}>
            <TextLine width="35%" typo="h4" />
            {PARAGRAPH.map((width) => (
              <TextLine key={`${section}-${width}`} width={width} />
            ))}
          </Stack>
        ))}
      </Stack>
    </SkeletonFrame>
  );
}
