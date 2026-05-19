import { Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import PhoneExtensionField from '../../components/PhoneExtensionField';

interface InterviewDetailsFormProps {
  isHost: boolean;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phoneExtension: string;
  setPhoneExtension: (v: string) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  businessName: string;
  setBusinessName: (v: string) => void;
  businessAddress: string;
  setBusinessAddress: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  zone: string;
  setZone: (v: string) => void;
  about: string;
  setAbout: (v: string) => void;
}

export default function InterviewDetailsForm({
  isHost,
  name,
  setName,
  email,
  setEmail,
  phoneExtension,
  setPhoneExtension,
  phoneNumber,
  setPhoneNumber,
  businessName,
  setBusinessName,
  businessAddress,
  setBusinessAddress,
  city,
  setCity,
  zone,
  setZone,
  about,
  setAbout,
}: InterviewDetailsFormProps) {
  const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 15);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Your details
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <PhoneExtensionField value={phoneExtension} onChange={setPhoneExtension} label="Code" size="medium" />
            <TextField
              label="Phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(onlyDigits(e.target.value))}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 }}
              fullWidth
              required
            />
          </Stack>
          {!isHost && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Venue name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Venue address"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                fullWidth
              />
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              fullWidth
            />
            <TextField
              label="Zone / Area"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              fullWidth
            />
          </Stack>
          <TextField
            label={isHost ? 'Why do you want to be a host?' : 'Tell us about your venue'}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            multiline
            minRows={4}
            fullWidth
            required
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
