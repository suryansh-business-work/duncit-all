import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import ShortLinkForm, { toShortLinkInput, type ShortLinkFormValues } from './short-link-form';
import {
  CAMPAIGNS_FOR_SHORT_LINK,
  CREATE_SHORT_LINK,
  type CampaignChoice,
  type ShortLinkOptions,
  type ShortLinkRow,
} from './queries';

interface Props {
  options: ShortLinkOptions;
  /** Creating a link to a NON-Duncit destination: different rule, different copy. */
  external?: boolean;
  onClose: () => void;
  onCreated: (link: ShortLinkRow) => void;
}

export default function CreateShortLinkDialog({
  options,
  external = false,
  onClose,
  onCreated,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const title = t(
    external ? 'marketing.externalLinks.newLink' : 'marketing.shortLinks.newShortLink',
  );
  const blurb = t(
    external ? 'marketing.externalLinks.newLinkBlurb' : 'marketing.shortLinks.newShortLinkBlurb',
  );
  const [error, setError] = useState<string | null>(null);
  const [createLink, { loading }] = useMutation<any>(CREATE_SHORT_LINK);
  const { data: campaignsData } = useQuery<{ shortLinkCampaigns: CampaignChoice[] }>(
    CAMPAIGNS_FOR_SHORT_LINK,
    { fetchPolicy: 'cache-and-network' },
  );

  const submit = async (values: ShortLinkFormValues) => {
    setError(null);
    try {
      const result = await createLink({
        variables: { input: toShortLinkInput(values, external) },
      });
      // Straight into the details dialog: the whole point of creating a link
      // is walking away with it, so the code and its QR are the next thing
      // you see rather than a row you then have to find.
      onCreated(result.data.createShortLink);
    } catch (e) {
      setError(parseApiError(e, 'Could not create the link'));
    }
  };

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={loading ? undefined : onClose}>
      <DialogTitle sx={{ pb: 0.5 }}>
        {/* DialogTitle is already an h2 — a nested h6 is invalid HTML. */}
        <Typography variant="h6" component="div" sx={{
          fontWeight: 700
        }}>
          {title}
        </Typography>
        <Typography variant="body2" component="div" sx={{
          color: "text.secondary"
        }}>
          {blurb}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <ShortLinkForm
          options={options}
          campaigns={campaignsData?.shortLinkCampaigns ?? []}
          external={external}
          busy={loading}
          errorMessage={error}
          onCancel={onClose}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
