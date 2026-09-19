import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { REGIONAL_FALLBACK, useTranslation } from '../../src/i18n';

describe('regional i18n', () => {
  it('flattens the console’s own bundle into dot-path keys', () => {
    expect(REGIONAL_FALLBACK['partners.regional.structureTitle']).toBe('Region Structure');
    expect(REGIONAL_FALLBACK['partners.regional.a11y.removeMember']).toBe('Remove {name} from region');
  });

  it('translates from that bundle outside any LocaleProvider', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.t('partners.regional.addClubAdmin')).toBe('Add Club Admin');
    expect(result.current.t('partners.regional.memberCount', { vars: { count: 3 } })).toBe('3 Club Admin(s)');
  });
});
