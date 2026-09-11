import { Box, Card, Divider, Stack } from '@mui/material';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import PhoneIcon from '@mui/icons-material/PhoneOutlined';
import LocationCityIcon from '@mui/icons-material/LocationCityOutlined';
import CakeIcon from '@mui/icons-material/CakeOutlined';
import AccountInfoRow from './AccountInfoRow';
import CompletionMeter from './CompletionMeter';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  me: any;
}

/**
 * Contact, location and birthday as one grouped list, with the profile
 * completion meter at its foot. Native twin: the details card on AccountScreen.
 */
export default function AccountDetailsCard({ me }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const phone = me.phone_number ? `${me.phone_extension || ''} ${me.phone_number}`.trim() : '—';

  return (
    <Card>
      <Stack divider={<Divider sx={{ ml: '68px' }} />}>
        <AccountInfoRow icon={<EmailIcon fontSize="small" />} label={t('mweb.common.email')} value={me.email || '—'} />
        <AccountInfoRow icon={<PhoneIcon fontSize="small" />} label={t('mweb.common.phone')} value={phone} />
        <AccountInfoRow
          icon={<LocationCityIcon fontSize="small" />}
          label={t('mweb.common.location')}
          value={[me.city, me.state, me.country].filter(Boolean).join(' · ') || '—'}
        />
        <AccountInfoRow
          icon={<CakeIcon fontSize="small" />}
          label={t('mweb.common.dateOfBirth')}
          value={me.dob ? formatDate(me.dob) : '—'}
        />
      </Stack>
      <Divider />
      <Box sx={{ p: 2 }}>
        <CompletionMeter profile={me} />
      </Box>
    </Card>
  );
}
