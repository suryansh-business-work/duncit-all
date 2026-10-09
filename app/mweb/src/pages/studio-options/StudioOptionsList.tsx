import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { StudioOptionItem } from '@duncit/utils';
import MenuGroup from '../../components/app-header/profile-drawer/MenuGroup';
import MenuRow from '../../components/app-header/profile-drawer/MenuRow';
import { profileIcon } from '../../components/app-header/profile-drawer/profileIcons';
import { STUDIO_OPTION_ICON } from '../../components/app-header/profile-drawer/studioOptionIcons';
import { useTranslation } from '../../i18n/useTranslation';
import { openPartnerPortal } from './openPartnerPortal';

interface Props {
  items: readonly StudioOptionItem[];
  onNavigate: (path: string) => void;
}

/**
 * Every option of a studio as one list: the option's glyph, its title and the
 * one-line hint under it, then a chevron. An option this app has no page for
 * (a brand's catalogue, its integrations, its returns) opens the Partner app
 * instead — it says so with the "opens outside" glyph in place of the chevron.
 */
export default function StudioOptionsList({ items, onNavigate }: Readonly<Props>) {
  const { t } = useTranslation();
  const opensOutside = t('mweb.studioOptions.opensInPartnerApp');

  return (
    <MenuGroup testId="studio-options-list">
      {items.map((item) => {
        const { path } = item;
        return (
          <MenuRow
            key={item.key}
            testId={`studio-option-${item.key}`}
            icon={profileIcon(STUDIO_OPTION_ICON[item.icon])}
            label={t(item.labelKey)}
            secondary={t(item.hintKey)}
            chevron={path !== undefined}
            trailing={
              path === undefined ? (
                <OpenInNewIcon
                  data-testid={`studio-option-${item.key}-external`}
                  titleAccess={opensOutside}
                  sx={{ fontSize: 20, color: 'text.secondary' }}
                />
              ) : undefined
            }
            onClick={() => {
              if (path === undefined) openPartnerPortal(item.portal);
              else onNavigate(path);
            }}
          />
        );
      })}
    </MenuGroup>
  );
}
