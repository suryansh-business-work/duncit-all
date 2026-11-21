import type { CrmSocialLink } from '../api/crm.types';
import { LeadDetailRow } from './LeadDetailCard';
import ExternalLink from './ExternalLink';

interface Props {
  links: CrmSocialLink[] | null | undefined;
}

/** A lead's extra social links as detail rows — the name it was given, then the link. */
export default function SocialLinksRows({ links }: Readonly<Props>) {
  return (
    <>
      {(links ?? []).map((link) => (
        <LeadDetailRow
          key={`${link.name}-${link.url}`}
          label={link.name || link.url}
          value={<ExternalLink variant="body2" href={link.url} />}
        />
      ))}
    </>
  );
}
