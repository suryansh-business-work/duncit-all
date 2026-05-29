import { NAV, isNavGroup } from './navConfig';

export interface AdminSearchItem {
  title: string;
  description: string;
  to: string;
  keywords: string[];
  section?: string;
}

const EXTRA_KEYWORDS: Record<string, string[]> = {
  '/users': ['members', 'customers', 'roles', 'user'],
  '/support-logs': ['tickets', 'help', 'contact'],
  '/inventory': ['products', 'stock', 'catalog', 'management'],
  '/branding': ['logo', 'theme', 'identity'],
  '/settings': ['system', 'config', 'preferences'],
  '/profile': ['account', 'me', 'admin'],
};

const words = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export const ADMIN_SEARCH_ITEMS: AdminSearchItem[] = NAV.flatMap((section) =>
  section.items.flatMap((item) => {
    if (isNavGroup(item)) {
      return item.children.map((child) => ({
        title: child.label,
        description: `${section.heading ?? item.label} / ${item.label}`,
        to: child.to,
        section: section.heading,
        keywords: [...words(child.to), ...words(item.label), ...(EXTRA_KEYWORDS[child.to] ?? [])],
      }));
    }
    return [{
      title: item.label,
      description: section.heading ?? 'Admin module',
      to: item.to,
      section: section.heading,
      keywords: [...words(item.to), ...(EXTRA_KEYWORDS[item.to] ?? [])],
    }];
  })
);