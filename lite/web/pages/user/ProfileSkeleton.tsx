import { Divider, Stack } from '@mui/material';
import { Dot, EventGroupsSkeleton, SkeletonFrame, TextLine, slots } from '../../components/skeletons';

/** A person's page while it loads: avatar, name and bio, then "Hosting" with its tabs and events. */
export function ProfileSkeleton() {
  return (
    <SkeletonFrame testId="profile-skeleton" sx={{ maxWidth: 820, mx: 'auto', width: '100%' }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { sm: 'center' } }}>
          <Dot size={96} />
          <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
            <TextLine width="45%" typo="h2" />
            <TextLine width="25%" typo="body2" />
            <TextLine width="70%" />
          </Stack>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <TextLine width={140} typo="h3" />
          <Stack direction="row" spacing={2}>
            {slots('tab', 2).map((tab) => (
              <TextLine key={tab} width={72} typo="body2" />
            ))}
          </Stack>
        </Stack>
        <EventGroupsSkeleton groups={1} />
      </Stack>
    </SkeletonFrame>
  );
}
