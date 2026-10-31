import { YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { TourAnchor } from '@/tours/TourAnchor';
import type { CreatePodCategoryIcon, CreatePodForm, CreatePodHostCategory } from '../create-pod.types';
import { HostCategoryField } from './HostCategoryField';
import { PodModeField } from './PodModeField';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  categoryIcons?: CreatePodCategoryIcon[];
  /** Club Admin mode: the pod's club is fixed, so it has no category to pick. */
  pinnedClub: boolean;
}

/** Step 1 — What: the category (it scopes the clubs on Where & when and the
 * products on Money) and whether the pod is physical or virtual. mWeb twin. */
export function WhatStep({ form, hostCategories, categoryIcons, pinnedClub }: Readonly<Props>) {
  return (
    <YStack gap={16} testID="create-pod-what-step">
      {pinnedClub ? null : (
        <TourAnchor tour="create-pod" anchor="create-pod-club">
          <SurfaceCard>
            <HostCategoryField form={form} hostCategories={hostCategories} categoryIcons={categoryIcons} />
          </SurfaceCard>
        </TourAnchor>
      )}
      <PodModeField form={form} pinnedClub={pinnedClub} />
    </YStack>
  );
}
