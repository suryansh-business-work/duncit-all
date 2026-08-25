import type { JSX } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PetsIcon from '@mui/icons-material/Pets';
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import EmailVerificationForm from './email-verification-form';
import PetProfileSection from './PetProfileSection';
import ProfileAboutSection from './ProfileAboutSection';
import UserHostPanel from './UserHostPanel';
import UserVenuePanel from './UserVenuePanel';
import { useTranslation } from '../../i18n/useTranslation';

function Title({ icon, label }: Readonly<{ icon: JSX.Element; label: string }>) {
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      {icon}
      <Typography sx={{
        fontWeight: 700
      }}>{label}</Typography>
    </Stack>
  );
}

export default function ProfileAccordions({
  me,
  onSaved,
  autoSendEmailOtp = false,
}: Readonly<{ me: any; onSaved: () => void; autoSendEmailOtp?: boolean }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<PersonIcon color="primary" />} label={t('mweb.profile.yourProfile')} />
        </AccordionSummary>
        <AccordionDetails>
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
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<PetsIcon color="primary" />} label={t('mweb.profile.petProfile2')} />
        </AccordionSummary>
        <AccordionDetails>
          <PetProfileSection pet={me.pet_profile} onSaved={onSaved} />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<WorkspacePremiumIcon color="primary" />} label={t('mweb.profile.userHost')} />
        </AccordionSummary>
        <AccordionDetails>
          <UserHostPanel />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<StorefrontIcon color="primary" />} label={t('mweb.profile.userVenues')} />
        </AccordionSummary>
        <AccordionDetails>
          <UserVenuePanel />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
