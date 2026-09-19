import { Chip, List, ListItem, ListItemButton, ListItemText, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import type { LiteLocale } from '../../graphql/localization';

interface Props {
  locales: readonly LiteLocale[];
  selectedCode: string | null;
  importing: boolean;
  onSelect: (locale: LiteLocale) => void;
  onAdd: () => void;
  onEdit: (locale: LiteLocale) => void;
  onDelete: (locale: LiteLocale) => void;
  onImport: () => void;
}

/** The languages, one selectable row each, plus the Import app keys button. */
export function LocalesPanel({ locales, selectedCode, importing, onSelect, onAdd, onEdit, onDelete, onImport }: Readonly<Props>) {
  const { t } = usePortalT();
  const addButton = (
    <DuncitButton size="small" startIcon={<AddIcon />} onClick={onAdd} data-testid="locale-add">
      {t('litePortal.localization.addLocale')}
    </DuncitButton>
  );

  return (
    <SectionCard title={t('litePortal.localization.locales')} action={addButton}>
      <Stack spacing={1.5}>
        <List disablePadding aria-label={t('litePortal.localization.locales')}>
          {locales.map((locale) => {
            const vars = { vars: { name: locale.english_label } };
            return (
              <ListItem
                key={locale.code}
                disablePadding
                secondaryAction={
                  <Stack direction="row" spacing={0.5} component="span">
                    <Tooltip title={t('litePortal.common.edit', vars)}>
                      <DuncitIconButton size="small" aria-label={t('litePortal.common.edit', vars)} onClick={() => onEdit(locale)} data-testid={`locale-edit-${locale.code}`}>
                        <EditIcon fontSize="small" />
                      </DuncitIconButton>
                    </Tooltip>
                    <Tooltip title={t('litePortal.common.delete', vars)}>
                      <span>
                        <DuncitIconButton size="small" color="error" disabled={locale.is_default} aria-label={t('litePortal.common.delete', vars)} onClick={() => onDelete(locale)} data-testid={`locale-delete-${locale.code}`}>
                          <DeleteIcon fontSize="small" />
                        </DuncitIconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                }
              >
                <ListItemButton selected={locale.code === selectedCode} onClick={() => onSelect(locale)} sx={{ borderRadius: 1, pr: 10 }} data-testid={`locale-select-${locale.code}`}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{locale.label}</span>
                        {locale.is_default && <Chip size="small" color="primary" label={t('litePortal.localization.default')} />}
                        {locale.is_rtl && <Chip size="small" variant="outlined" label={t('litePortal.localization.rtl')} />}
                        {!locale.is_active && <Chip size="small" variant="outlined" label={t('litePortal.common.inactive')} />}
                      </Stack>
                    }
                    secondary={`${locale.english_label} · ${locale.code} · ${t('litePortal.localization.translated', { vars: { count: locale.translated_count } })}`}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <DuncitButton variant="outlined" startIcon={<CloudDownloadIcon />} loading={importing} onClick={onImport} data-testid="locale-import-keys">
          {t('litePortal.localization.importKeys')}
        </DuncitButton>
      </Stack>
    </SectionCard>
  );
}
