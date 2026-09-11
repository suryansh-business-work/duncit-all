import type { JSX } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlineRounded';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import IconDisc from '../account-page/IconDisc';
import EmailVerificationForm from './email-verification-form';
import PetProfileSection from './PetProfileSection';
import ProfileAboutSection from './ProfileAboutSection';
import UserHostPanel from './UserHostPanel';
import UserVenuePanel from './UserVenuePanel';
import { useTranslation } from '../../i18n/useTranslation';

function Title({ icon, label }: Readonly<{ icon: JSX.Element; label: string }>) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <IconDisc>{icon}</IconDisc>
      <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{label}</Typography>
    </Stack>
  );
}

const SUMMARY_SX = { px: 2, minHeight: 60 } as const;
const DETAILS_SX = { px: 2, pt: 0, pb: 2 } as const;

export default function ProfileAccordions({
  me,
  onSaved,
  autoSendEmailOtp = false,
}: Readonly<{ me: any; onSaved: () => void; autoSendEmailOtp?: boolean }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={SUMMARY_SX}>
          <Title icon={<PersonIcon />} label={t('mweb.profile.yourProfile')} />
        </AccordionSummary>
        <AccordionDetails sx={DETAILS_SX}>
          <Stack spacing={2}>
            <EmailVerificationForm
              email={me.email}
              verified={me.is_email_verified}
              onVerified={onSaved}
              autoSend={autoSendEmailOtp}
            />
            <ProfileAboutSection me={me} onSaved={onSaved} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={SUMMARY_SX}>
          <Title icon={<PetsIcon />} label={t('mweb.profile.petProfile2')} />
        </AccordionSummary>
        <AccordionDetails sx={DETAILS_SX}>
          <PetProfileSection pet={me.pet_profile} onSaved={onSaved} />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={SUMMARY_SX}>
          <Title icon={<WorkspacePremiumIcon />} label={t('mweb.profile.userHost')} />
        </AccordionSummary>
        <AccordionDetails sx={DETAILS_SX}>
          <UserHostPanel />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={SUMMARY_SX}>
          <Title icon={<StorefrontIcon />} label={t('mweb.profile.userVenues')} />
        </AccordionSummary>
        <AccordionDetails sx={DETAILS_SX}>
          <UserVenuePanel />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
