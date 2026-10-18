import { Link, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { gigContactLinks, type GigContact } from '@duncit/utils';

/** A contact in a table cell: the phone and email as tap-to-call / tap-to-mail links. */
export default function ContactCell({ contact }: Readonly<{ contact: GigContact }>) {
  const links = gigContactLinks(contact);
  return (
    <Stack component="span" sx={{ lineHeight: 1.3 }}>
      {links.call ? (
        <Link href={links.call} variant="body2" underline="hover">
          {contact.phone}
        </Link>
      ) : null}
      {links.email ? (
        <Link href={links.email} variant="caption" underline="hover" color="text.secondary">
          {contact.email}
        </Link>
      ) : null}
      {!links.call && !links.email ? (
        <Typography variant="body2" component="span" color="text.secondary">
          {EM_DASH}
        </Typography>
      ) : null}
    </Stack>
  );
}
