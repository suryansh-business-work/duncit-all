import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PetsIcon from '@mui/icons-material/Pets';
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MyBadges from '../../components/MyBadges';
import EmailVerificationForm from './email-verification-form';
import PetProfileSection from './PetProfileSection';
import ProfileAboutSection from './ProfileAboutSection';
import UserHostPanel from './UserHostPanel';
import UserVenuePanel from './UserVenuePanel';

function Title({ icon, label }: Readonly<{ icon: JSX.Element; label: string }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {icon}
      <Typography fontWeight={700}>{label}</Typography>
    </Stack>
  );
}

export default function ProfileAccordions({ me, onSaved }: Readonly<{ me: any; onSaved: () => void }>) {
  return (
    <Stack spacing={1}>
      <Accordion defaultExpanded disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<PersonIcon color="primary" />} label="Your Profile" />
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <EmailVerificationForm email={me.email} verified={me.is_email_verified} onVerified={onSaved} />
          <ProfileAboutSection me={me} onSaved={onSaved} />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<PetsIcon color="primary" />} label="Pet Profile" />
        </AccordionSummary>
        <AccordionDetails>
          <PetProfileSection pet={me.pet_profile} onSaved={onSaved} />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<EmojiEventsIcon color="primary" />} label="Badges" />
        </AccordionSummary>
        <AccordionDetails>
          <MyBadges />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<WorkspacePremiumIcon color="primary" />} label="User Host" />
        </AccordionSummary>
        <AccordionDetails>
          <UserHostPanel />
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Title icon={<StorefrontIcon color="primary" />} label="User Venues" />
        </AccordionSummary>
        <AccordionDetails>
          <UserVenuePanel />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
