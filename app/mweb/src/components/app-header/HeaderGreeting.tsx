import { Box, ButtonBase } from '@mui/material';
import TwoToneHeading from '../TwoToneHeading';
import { APP_SHELL_MAX_WIDTH } from '../../app/appLayout';
import { useTranslation } from '../../i18n/useTranslation';

const DEFAULT_TAGLINE = 'It All Starts Here!';

const WRAP_SX = {
  display: 'block',
  width: '100%',
  maxWidth: APP_SHELL_MAX_WIDTH,
  mx: 'auto',
  px: 2,
  pt: 1,
  pb: 1.5,
  boxSizing: 'border-box',
  textAlign: 'left',
} as const;

interface Props {
  tagline?: string | null;
  /** The signed-in user's first name — without one the tagline leads alone. */
  firstName?: string | null;
  /** Opens the location picker. Omit for the minimal (survey) header. */
  onOpenLocation?: () => void;
}

/** Home header greeting (row two): "Hello, <name>!" in ink over the
 * admin-configurable tagline in muted, one 24px two-tone heading. Native twin:
 * components/AppHeader/HeaderGreeting. */
export default function HeaderGreeting({ tagline, firstName, onOpenLocation }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = tagline?.trim() || DEFAULT_TAGLINE;
  const name = firstName?.trim();
  const lead = name ? t('mweb.home.greetingHello', { vars: { name } }) : title;
  const trail = name ? title : null;
  const heading = <TwoToneHeading lead={lead} trail={trail} stacked variant="h5" component="p" />;

  if (!onOpenLocation) return <Box sx={WRAP_SX}>{heading}</Box>;
  // The greeting also opens the location picker — a bigger tap target than
  // the location pill alone (user ask).
  return (
    <ButtonBase component="div" disableRipple onClick={onOpenLocation} sx={WRAP_SX}>
      {heading}
    </ButtonBase>
  );
}
