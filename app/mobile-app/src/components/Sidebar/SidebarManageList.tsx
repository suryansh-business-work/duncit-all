import type { MenuRoute } from '@/navigation/types';
import type { ProfileTile } from './profileSections';
import { SidebarGroup } from './SidebarGroup';
import { SidebarRow } from './SidebarRow';

/** A titled, grouped sidebar list (icon disc + label + chevron rows) — RN port
 * of mWeb's <ManageAccountList/>. Reused for Manage Account, Shop and the
 * partner menus. Rows carry no caption: the label says where it goes. */
export function SidebarManageList({
  title,
  items,
  onNavigate,
}: Readonly<{
  title: string;
  items: readonly ProfileTile[];
  onNavigate: (route: MenuRoute) => void;
}>) {
  return (
    <SidebarGroup title={title}>
      {items.map((item) => (
        <SidebarRow
          key={item.key}
          testID={`sidebar-item-${item.label}`}
          icon={item.icon}
          label={item.label}
          badge={item.badge}
          onPress={() => onNavigate(item.route)}
        />
      ))}
    </SidebarGroup>
  );
}
