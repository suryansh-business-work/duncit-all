import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { FoodAccountMode } from '@duncit/venue-food';
import ConnectionDialog from '../../../ecomm-brand-page/integrations/ConnectionDialog';
import type { PartnerIntegration } from '../../../ecomm-brand-page/integrations/integrations.queries';

interface Props {
  /** Picks the account just saved in the venue's food ordering. */
  select: (connectionId: string) => void;
  idPrefix: string;
}

/**
 * The Partner console's own "add a Razorpay account" — the saved-connections
 * dialog the Integrations page uses. An account that failed its connection
 * check cannot take orders, so it is left for the owner to fix rather than
 * picked.
 */
function AddRazorpayAccount({ select, idPrefix }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const pickSaved = (saved: PartnerIntegration) => {
    if (saved.status.connected) select(saved.id);
  };

  return (
    <>
      <DuncitButton
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ flexShrink: 0 }}
        data-testid={`${idPrefix}-food-add-razorpay`}
      >
        {t('venueFoodOwner.menu.addAccount')}
      </DuncitButton>
      <ConnectionDialog
        open={open}
        provider="RAZORPAY"
        connection={null}
        onClose={() => setOpen(false)}
        onSaved={pickSaved}
      />
    </>
  );
}

/** How the Partner console handles the account guests pay: the picker, with the console's own way to add one. */
export const partnersFoodAccount = (idPrefix: string): FoodAccountMode => ({
  kind: 'picker',
  addAccount: (select) => <AddRazorpayAccount select={select} idPrefix={idPrefix} />,
});
