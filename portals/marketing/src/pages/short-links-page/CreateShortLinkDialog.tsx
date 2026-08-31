import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
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
  onClose: () => void;
  onCreated: (link: ShortLinkRow) => void;
}

export default function CreateShortLinkDialog({
  options,
  onClose,
  onCreated,
}: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const [createLink, { loading }] = useMutation<any>(CREATE_SHORT_LINK);
  const { data: campaignsData } = useQuery<{ shortLinkCampaigns: CampaignChoice[] }>(
    CAMPAIGNS_FOR_SHORT_LINK,
    { fetchPolicy: 'cache-and-network' },
  );

  const submit = async (values: ShortLinkFormValues) => {
    setError(null);
    try {
      const result = await createLink({ variables: { input: toShortLinkInput(values) } });
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
          New short link
        </Typography>
        <Typography variant="body2" component="div" sx={{
          color: "text.secondary"
        }}>
          You get a duncit.com link that tags its destination for you.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <ShortLinkForm
          options={options}
          campaigns={campaignsData?.shortLinkCampaigns ?? []}
          busy={loading}
          errorMessage={error}
          onCancel={onClose}
          onSubmit={submit}
        />
      </DialogContent>
    </Dialog>
  );
}
