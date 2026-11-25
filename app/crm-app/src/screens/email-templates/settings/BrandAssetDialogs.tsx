import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ActionSheet } from '@/components/email-templates/ActionSheet';
import { DialogCard } from '@/components/email-templates/DialogCard';
import type { BrandAsset, EmailSettingsState } from '@/features/email-templates/useEmailSettings';
import { MediaNameForm } from '@/forms/media-name';
import { useTranslation } from '@/hooks/useTranslation';
import { brandActions } from './brandActions';
import { BrandAssetPreview } from './BrandAssetPreview';

const SCOPE = 'crm-app/EmailBrandAssets';

export type BrandDialog = {
  kind: 'menu' | 'preview' | 'rename' | 'delete';
  asset: BrandAsset;
} | null;

interface Props {
  open: BrandDialog;
  setOpen: (next: BrandDialog) => void;
  brand: EmailSettingsState;
  primaryLogoId: string | null;
}

/** A brand image's actions sheet, its full-size preview, the rename form and the delete confirm. */
export function BrandAssetDialogs({ open, setOpen, brand, primaryLogoId }: Readonly<Props>) {
  const { t } = useTranslation();
  const later = (work: Promise<unknown>, action: string) =>
    fireAndForget(work, logs.mobileApp, SCOPE, action);
  const close = () => setOpen(null);
  const menu = open?.kind === 'menu' ? open.asset : null;
  const renaming = open?.kind === 'rename' ? open.asset : null;
  const deleting = open?.kind === 'delete' ? open.asset : null;

  const confirmDelete = async (asset: BrandAsset) => {
    await brand.remove(asset);
    close();
  };

  return (
    <>
      {menu ? (
        <ActionSheet
          open
          title={t('crm.media.actionsFor', {
            vars: { name: menu.name || t('crm.media.untitled') },
          })}
          actions={brandActions(t, menu, primaryLogoId, brand.busy, {
            preview: (asset) => setOpen({ kind: 'preview', asset }),
            toggleLogo: (asset) =>
              later(brand.setPrimaryLogo(asset.id === primaryLogoId ? null : asset.id), 'logo'),
            replace: (asset) => later(brand.replace(asset), 'replace'),
            rename: (asset) => setOpen({ kind: 'rename', asset }),
            refile: (asset, kind) => later(brand.refile(asset, kind), 'refile'),
            remove: (asset) => setOpen({ kind: 'delete', asset }),
          })}
          onClose={close}
          testID="brand-actions"
        />
      ) : null}
      <BrandAssetPreview asset={open?.kind === 'preview' ? open.asset : null} onClose={close} />
      {renaming ? (
        <DialogCard open title={t('crm.media.rename')} onRequestClose={close} testID="brand-rename">
          <MediaNameForm
            initialName={renaming.name}
            busy={brand.busy}
            error={brand.actionError}
            onSubmit={async ({ name }) => {
              if (await brand.rename(renaming, name)) close();
            }}
            onCancel={() => {
              brand.clearActionError();
              close();
            }}
          />
        </DialogCard>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          title={t('crm.media.deleteTitle')}
          message={t('crm.emailSettings.deleteAssetMessage', {
            vars: { name: deleting.name || t('crm.media.untitled') },
          })}
          confirmLabel={t('shell.common.delete')}
          cancelLabel={t('shell.common.cancel')}
          danger
          busy={brand.busy}
          onConfirm={() => later(confirmDelete(deleting), 'delete')}
          onCancel={close}
          testID="brand-delete-dialog"
        />
      ) : null}
    </>
  );
}
