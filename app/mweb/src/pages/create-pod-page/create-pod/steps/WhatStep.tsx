import { Box, Stack } from '@mui/material';
import { SURFACE_SX } from '../../../../theme';
import HostCategoryField from './HostCategoryField';
import PodModeField from './PodModeField';
import type { CreatePodCategoryIcon, CreatePodClub, CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  categoryIcons?: CreatePodCategoryIcon[];
  clubs: CreatePodClub[];
}

/** Step 1 — What: the category (it scopes the clubs on Where & when and the
 * products on Money) and whether the pod is physical or virtual. Native twin: WhatStep. */
export default function WhatStep({ form, hostCategories, categoryIcons, clubs }: Readonly<Props>) {
  return (
    <Stack data-testid="create-pod-what-step" spacing={2}>
      <Box data-tour="create-pod-club" sx={{ ...SURFACE_SX, p: 2 }}>
        <HostCategoryField form={form} hostCategories={hostCategories} categoryIcons={categoryIcons} clubs={clubs} />
      </Box>
      <PodModeField form={form} />
    </Stack>
  );
}
