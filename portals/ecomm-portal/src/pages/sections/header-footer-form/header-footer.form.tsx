import type { Control } from 'react-hook-form';
import { Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import RhfFieldList from '../../../components/form/FieldList';
import RhfLinkField, { type LinkOption } from '../../../components/form/RhfLinkField';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useLinkOptions } from '../../home-page/home-section-form/useLinkOptions';
import { BLANK_NAV_LINK, MAX_NAV_LINKS, type HeaderFooterValues } from './header-footer.types';

type HeaderFooterControl = Control<HeaderFooterValues>;

interface NavLinksFieldProps {
  control: HeaderFooterControl;
  name: 'nav_links' | 'footer_links';
  heading: string;
  hint: string;
  options: readonly LinkOption[];
}

/** The header's or the footer's own links, in the order the store draws them. */
function NavLinksField({ control, name, heading, hint, options }: Readonly<NavLinksFieldProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Typography component="h3" variant="subtitle2">
        {heading}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {hint}
      </Typography>
      <RhfFieldList
        control={control}
        name={name}
        blank={BLANK_NAV_LINK}
        max={MAX_NAV_LINKS}
        columns={[
          { key: 'label', label: t('ecommPortal.sections.linkLabel'), required: true },
          { key: 'link', label: t('ecommPortal.homePage.link'), kind: 'link', options, hint: t('ecommPortal.homePage.linkHint'), required: true },
        ]}
        addLabel={t('ecommPortal.sections.addLink')}
        itemLabel={(position) => t('ecommPortal.sections.linkN', { vars: { n: position } })}
      />
    </Stack>
  );
}

/** What every storefront page wears: the announcement bar, the phone greeting, and the header and footer links. */
export default function HeaderFooterFields({ control }: Readonly<{ control: HeaderFooterControl }>) {
  const { t } = useTranslation();
  const linkOptions = useLinkOptions();
  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <RhfSwitch
          control={control}
          name="announcement_enabled"
          label={t('ecommPortal.settings.announcement')}
          hint={t('ecommPortal.settings.announcementHint')}
        />
        <RhfTextField control={control} name="announcement_text" label={t('ecommPortal.settings.announcementText')} />
        <RhfLinkField control={control} name="announcement_link" label={t('ecommPortal.homePage.link')} options={linkOptions} />
      </Stack>
      <Divider />
      <RhfTextField
        control={control}
        name="home_greeting"
        label={t('ecommPortal.sections.homeGreeting')}
        hint={t('ecommPortal.sections.homeGreetingHint')}
      />
      <Divider />
      <NavLinksField
        control={control}
        name="nav_links"
        heading={t('ecommPortal.sections.headerLinks')}
        hint={t('ecommPortal.sections.headerLinksHint', { vars: { max: MAX_NAV_LINKS } })}
        options={linkOptions}
      />
      <Divider />
      <NavLinksField
        control={control}
        name="footer_links"
        heading={t('ecommPortal.sections.footerLinks')}
        hint={t('ecommPortal.sections.footerLinksHint', { vars: { max: MAX_NAV_LINKS } })}
        options={linkOptions}
      />
    </Stack>
  );
}
