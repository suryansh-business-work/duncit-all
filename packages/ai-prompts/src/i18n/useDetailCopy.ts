import { useMemo } from 'react';
import { useTranslation } from '@duncit/app-settings';
import { detailCopy, type DetailCopy } from '../detailCopy';

/** The detail view's copy in the reader's language; rebuilt when the catalogue lands. */
export function useDetailCopy(): DetailCopy {
  const { t } = useTranslation();
  return useMemo(() => detailCopy(t), [t]);
}
