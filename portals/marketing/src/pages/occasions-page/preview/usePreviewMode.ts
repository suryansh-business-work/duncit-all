import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { urlConfigs } from '../../../config/url-configs';
import type { PreviewMode } from './palette';

/** A preview's light/dark choice, starting from the mode the console itself is in. */
export function usePreviewMode() {
  const theme = useTheme();
  return useState<PreviewMode>(theme.palette.mode);
}

/** mWeb wearing a look for whoever opens the link — nobody else's app changes. */
export const mwebPreviewUrl = (key: string): string => `${urlConfigs.mwebUrl}/?occasion=${encodeURIComponent(key)}`;
