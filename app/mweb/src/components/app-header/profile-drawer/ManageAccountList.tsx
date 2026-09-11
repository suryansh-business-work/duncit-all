import { profileIcon } from './profileIcons';
import type { ProfileTile } from './profileSections';
import MenuGroup from './MenuGroup';
import MenuRow from './MenuRow';

interface ManageAccountListProps {
  title: string;
  items: readonly ProfileTile[];
  onNavigate: (to: string) => void;
}

/** A titled, grouped drawer list — icon disc + label + chevron rows. Reused for
 * Manage Account, Shop and the partner menus. Rows carry no caption: the label
 * says where it goes. */
export default function ManageAccountList({ title, items, onNavigate }: Readonly<ManageAccountListProps>) {
  return (
    <MenuGroup title={title}>
      {items.map((item) => (
        <MenuRow
          key={item.key}
          icon={profileIcon(item.icon)}
          label={item.label}
          badge={item.badge}
          onClick={() => onNavigate(item.to)}
        />
      ))}
    </MenuGroup>
  );
}
