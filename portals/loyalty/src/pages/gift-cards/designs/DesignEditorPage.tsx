import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Chip, Stack } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import InventoryIcon from '@mui/icons-material/Inventory2';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import DetailHeader from '../../../components/detail/DetailHeader';
import DetailPageState, { isNotFoundError } from '../../../components/detail/DetailPageState';
import { useCanWrite } from '../../../lib/roles';
import DesignForm from './design-form';
import StockAdjustForm from './stock-adjust';
import { useDesignEditor } from './useDesignEditor';
import type { GiftCardDesignRow } from './queries';

const LIST_PATH = '/gift-cards/designs';

interface ActionsProps {
  design: GiftCardDesignRow;
  busy: boolean;
  onMakeDefault: () => void;
  onToggleActive: (next: boolean) => void;
  onAdjustStock: () => void;
}

function DesignActions({ design, busy, onMakeDefault, onToggleActive, onAdjustStock }: Readonly<ActionsProps>) {
  const { t } = useTranslation();
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      <DuncitButton variant="outlined" startIcon={<InventoryIcon />} onClick={onAdjustStock} data-testid="design-adjust-stock">
        {t('loyalty.designs.adjustStockCta')}
      </DuncitButton>
      {!design.is_default && (
        <DuncitButton variant="outlined" startIcon={<PowerSettingsNewIcon />} disabled={busy} onClick={() => onToggleActive(!design.is_active)}>
          {design.is_active ? t('loyalty.designs.switchOffCta') : t('loyalty.designs.switchOnCta')}
        </DuncitButton>
      )}
      {!design.is_default && (
        <DuncitButton variant="contained" startIcon={<StarIcon />} disabled={busy} onClick={onMakeDefault} data-testid="design-make-default">
          {t('loyalty.designs.makeDefaultCta')}
        </DuncitButton>
      )}
    </Stack>
  );
}

/**
 * Loyalty > Gift Card Designs > one design (or a new one): the artwork with its
 * live flip preview, and — for an existing design — making it the one members
 * buy, switching it off, and correcting its printed stock.
 */
export default function DesignEditorPage() {
  const { id = 'new' } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useCanWrite();
  const [stockOpen, setStockOpen] = useState(false);
  const editor = useDesignEditor(isNew ? null : id);
  const { design } = editor;

  const status = design ? (
    <Chip
      size="small"
      color={design.is_default ? 'primary' : 'default'}
      label={design.is_default ? t('loyalty.designs.default') : t('loyalty.designs.stockChip', { vars: { n: design.physical_stock } })}
      sx={{ fontWeight: 800 }}
    />
  ) : undefined;

  const form = (
    <Stack spacing={2.5}>
      <DetailHeader
        backTo={LIST_PATH}
        backLabel={t('loyalty.designs.backToList')}
        title={design?.name ?? t('loyalty.designs.newTitle')}
        subtitle={design ? t('loyalty.designs.stockSubtitle', { vars: { n: design.physical_stock } }) : t('loyalty.designs.newSubtitle')}
        status={status}
        actions={
          design && canWrite ? (
            <DesignActions
              design={design}
              busy={editor.acting}
              onMakeDefault={editor.makeDefault}
              onToggleActive={editor.toggleActive}
              onAdjustStock={() => setStockOpen(true)}
            />
          ) : undefined
        }
      />
      <DesignForm
        design={design}
        categories={editor.categories}
        busy={editor.saving}
        readOnly={!canWrite}
        errorMessage={editor.formError}
        onSubmit={editor.save}
        onCancel={() => navigate(LIST_PATH)}
      />
      {design && (
        <StockAdjustForm
          open={stockOpen}
          designName={design.name}
          currentStock={design.physical_stock}
          busy={editor.adjusting}
          errorMessage={editor.stockError}
          onCancel={() => setStockOpen(false)}
          onSubmit={async (delta, reason) => {
            if (await editor.adjustStock(delta, reason)) setStockOpen(false);
          }}
        />
      )}
    </Stack>
  );

  if (isNew) return form;
  return (
    <DetailPageState
      loading={editor.loading && !design}
      error={editor.error}
      notFound={isNotFoundError(editor.error) || (!editor.loading && !editor.error && !design)}
      onRetry={() => editor.refetch()}
    >
      {design && form}
    </DetailPageState>
  );
}
