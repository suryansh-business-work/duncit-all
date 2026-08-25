import type { useTranslation } from '@duncit/app-settings';
import { countBadge, type SidebarItem } from '../../components/EmailSidebarList';
import type { Fragment, FragmentTemplateRef } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The fragment list, as rows the shared sidebar can sort and filter.
 *
 * The count is how many templates this header and footer is wrapped around —
 * the number that says whether an edit here touches one internal email or
 * every receipt the platform sends. Sorting by it puts the consequential
 * fragments at the top; a zero means nothing consumes it at all.
 */
export function fragmentSidebarItems(
  t: Translate,
  list: Fragment[],
  templatesByFragment: Map<string, FragmentTemplateRef[]>
): SidebarItem[] {
  return list.map((fragment) => {
    const used = templatesByFragment.get(fragment.key)?.length ?? 0;
    return {
      key: fragment.key,
      primary: fragment.name,
      secondary: fragment.key,
      off: !fragment.is_active,
      count: used,
      updatedAt: fragment.updated_at ?? null,
      badge: countBadge(used, t('tech.emailFragments.templatesUseThis', { vars: { count: used } })),
    };
  });
}
