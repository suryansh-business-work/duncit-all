import { renderHook } from '@testing-library/react';
import { useTranslation } from '@duncit/shell';

export type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The translator a CRM component gets with no provider above it (English, from
 * the shipped bundles), for schemas that take `t` and are tested outside React.
 */
export function englishT(): Translate {
  return renderHook(() => useTranslation()).result.current.t;
}
