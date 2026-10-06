import { useId, useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { PagePreset } from './page-form';

/**
 * Starts one of a site's error pages: an ordinary page at /404, /500 or /503
 * that the live site shows for "not found", "something broke" and "down for
 * maintenance" (the renderer keeps a copy of the last two for when the API is
 * the thing that is down).
 */
export default function ErrorPagesMenu({ onCreate }: Readonly<{ onCreate: (preset: PagePreset) => void }>) {
  const { t } = useTranslation();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const presets: (PagePreset & { label: string })[] = [
    { path: '/404', title: t('websiteApp.cms.pages.error404Title'), label: t('websiteApp.cms.pages.error404') },
    { path: '/500', title: t('websiteApp.cms.pages.error500Title'), label: t('websiteApp.cms.pages.error500') },
    { path: '/503', title: t('websiteApp.cms.pages.error503Title'), label: t('websiteApp.cms.pages.error503') },
  ];

  return (
    <>
      <DuncitButton
        size="small"
        startIcon={<ReportProblemOutlinedIcon />}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid="cms-error-pages"
      >
        {t('websiteApp.cms.pages.errorPages')}
      </DuncitButton>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {presets.map(({ label, ...preset }) => (
          <MenuItem
            key={preset.path}
            onClick={() => {
              setAnchor(null);
              onCreate(preset);
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
