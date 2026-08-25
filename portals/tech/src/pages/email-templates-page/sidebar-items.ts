import type { useTranslation } from '@duncit/app-settings';
import { countBadge, type SidebarItem, type SidebarOption } from '../../components/EmailSidebarList';
import type { FragmentOption, TemplateUsage, Tpl } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The template list, as rows the shared sidebar can sort and filter.
 *
 * Every row carries its send count, including the zeroes — a template nothing
 * has ever sent is the thing this list could not show, and "Most used" is the
 * sort that surfaces them. `group` is the header/footer wrapped around it,
 * which is what the Fragments page links here to narrow by.
 */
export function templateSidebarItems(
  t: Translate,
  list: Tpl[],
  usageBySlug: Map<string, TemplateUsage>
): SidebarItem[] {
  return list.map((tpl) => {
    const sent = usageBySlug.get(tpl.slug)?.sent ?? 0;
    return {
      key: tpl.template_id,
      primary: tpl.name,
      secondary: tpl.slug,
      off: !tpl.is_active,
      count: sent,
      updatedAt: tpl.updated_at ?? null,
      group: tpl.fragment_key ?? '',
      badge: countBadge(sent, t('tech.emailTemplates.sendsRecorded', { vars: { count: sent } })),
    };
  });
}

/** The header/footer filter's options, named as the Fragments page names them. */
export function fragmentFilterOptions(fragments: FragmentOption[]): SidebarOption<string>[] {
  return fragments.map((fragment) => ({ value: fragment.key, label: fragment.name }));
}
