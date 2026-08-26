import { Alert, AlertTitle, Avatar, Button, Chip, Link, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import type {
  PodAttendanceClubAdmin,
  PodAttendanceLabels,
  PodAttendanceLock,
} from '@duncit/utils';

/**
 * Why marking matters.
 *
 * Deliberately an `info` alert pinned at the top rather than a footnote: the
 * host is not being warned about a risk, they are being told the rule they are
 * paid by, and it has to be read before the roster rather than after it.
 */
export function EarningsNotice({
  labels,
  body,
}: Readonly<{ labels: PodAttendanceLabels; body: string }>) {
  return (
    <Alert severity="info" data-testid="attendance-earnings-note">
      <AlertTitle sx={{ fontWeight: 800 }}>{labels.earningsTitle}</AlertTitle>
      {body}
    </Alert>
  );
}

/** The roster is closed and nothing on it can move. */
export function LockedNotice({
  lock,
  labels,
}: Readonly<{ lock: PodAttendanceLock; labels: PodAttendanceLabels }>) {
  return (
    <Alert severity="warning" data-testid="attendance-locked-note">
      <AlertTitle sx={{ fontWeight: 800 }}>{labels.lockedTitle(lock)}</AlertTitle>
      {labels.lockedBody(lock)}
    </Alert>
  );
}

/** One contact chip, only rendered when there is something to open. */
function ContactChip({
  href,
  icon,
  label,
}: Readonly<{ href: string; icon: React.ReactElement; label: string }>) {
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      component={Link}
      href={href}
      clickable
      sx={{ fontWeight: 700 }}
    />
  );
}

function ClubAdminRow({
  admin,
  labels,
}: Readonly<{ admin: PodAttendanceClubAdmin; labels: PodAttendanceLabels }>) {
  // `tel:`/`wa.me` want the number without spaces or separators. `replace(/g)`
  // rather than `replaceAll` — this package's tsconfig target predates ES2021.
  const dial = admin.phone.replace(/[^\d+]/g, '');
  const wa = admin.whatsapp.replace(/\D/g, '');
  return (
    <Stack direction="row" spacing={1.25} sx={{
      alignItems: "center"
    }}>
      <Avatar src={admin.avatar_url || undefined} sx={{ width: 34, height: 34 }}>
        {(admin.name[0] ?? '?').toUpperCase()}
      </Avatar>
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {admin.name}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, pt: 0.25 }}>
          {admin.email && (
            <ContactChip
              href={`mailto:${admin.email}`}
              icon={<EmailIcon />}
              label={labels.contactEmail}
            />
          )}
          {dial && (
            <ContactChip href={`tel:${dial}`} icon={<PhoneIcon />} label={labels.contactPhone} />
          )}
          {wa && (
            <ContactChip
              href={`https://wa.me/${wa}`}
              icon={<WhatsAppIcon />}
              label={labels.contactWhatsapp}
            />
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}

/**
 * Who to ask when the host cannot mark somebody themselves.
 *
 * Sits at the BOTTOM of the page, under the roster: it is the answer to "this
 * person is missing and I cannot add them", which is a question the host only
 * has after reading the list.
 */
export function ClubAdminHelpCard({
  admins,
  labels,
}: Readonly<{ admins: readonly PodAttendanceClubAdmin[]; labels: PodAttendanceLabels }>) {
  return (
    <Stack
      spacing={1.25}
      data-testid="attendance-club-admin-card"
      sx={{ p: 1.5, borderRadius: '16px', border: 1, borderColor: 'divider' }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {labels.clubAdminTitle}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {labels.clubAdminBody}
      </Typography>
      {admins.length === 0 ? (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {labels.clubAdminNone}
        </Typography>
      ) : (
        admins.map((admin) => <ClubAdminRow key={admin.id} admin={admin} labels={labels} />)
      )}
    </Stack>
  );
}

/** The bottom call to action — the scanner is still the fastest way in. */
export function ScanCta({
  labels,
  onScan,
  icon,
}: Readonly<{ labels: PodAttendanceLabels; onScan: () => void; icon: React.ReactElement }>) {
  return (
    <Button
      fullWidth
      size="large"
      variant="contained"
      startIcon={icon}
      onClick={onScan}
      data-testid="attendance-scan-cta"
      sx={{ borderRadius: 999, fontWeight: 800, py: 1.25 }}
    >
      {labels.scanCta}
    </Button>
  );
}
