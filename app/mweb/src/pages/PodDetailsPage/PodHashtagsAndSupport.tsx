import type { ComponentProps } from 'react';
import { Chip, Stack } from '@mui/material';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../i18n/useTranslation';
import type PodDetailAccordions from '../pod-details-page/PodDetailAccordions';

interface PodHashtagsAndSupportProps {
  pod: ComponentProps<typeof PodDetailAccordions>['pod'];
}

/** The pod's hashtags and the "contact support" door pre-filled with this pod. */
export default function PodHashtagsAndSupport({ pod }: Readonly<PodHashtagsAndSupportProps>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const supportSubject = `Support - ${pod.pod_title}`;
  return (
    <>
      {pod.pod_hashtag?.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {pod.pod_hashtag.map((t: string) => (
            <Chip key={t} size="small" data-testid={`pod-details-hashtag-${t}`} label={`#${t}`} />
          ))}
        </Stack>
      )}

      <DuncitButton
        variant="text"
        size="small"
        startIcon={<ContactSupportIcon />}
        data-testid="pod-details-contact-support"
        onClick={() =>
          navigate(
            `/support/tickets?category=BOOKING&podId=${pod.id}&podTitle=${encodeURIComponent(pod.pod_title)}&subject=${encodeURIComponent(supportSubject)}`
          )
        }
        sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
      >
        {t('mweb.podDetails.contactSupport')}
      </DuncitButton>
    </>
  );
}
