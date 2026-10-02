import { Avatar, Chip, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { CatItem, Level } from '../queries';
import { isImageIconValue, renderIconByName } from '../../../components/IconPickerField';

interface Props {
  it: CatItem;
  level: Level;
  selectedId: string | null;
  onSelect: (item: CatItem) => void;
  onEdit: (item: CatItem) => void;
  onDelete: (item: CatItem) => void;
}

/** One category row inside a ColumnPanel list. */
export default function ColumnRow({ it, level, selectedId, onSelect, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const iconIsImage = isImageIconValue(it.icon);
  const hasIconValue = !!it.icon?.trim();
  const materialIcon = iconIsImage ? null : renderIconByName(it.icon, 'small');
  const mediaFallback = hasIconValue ? undefined : it.media[0]?.url;
  const avatarSrc = iconIsImage ? it.icon : mediaFallback;
  const textIcon = iconIsImage ? '' : it.icon;
  const ellipsis = (it.description?.length ?? 0) > 50 ? '…' : '';
  const secondaryText = it.description
    ? it.description.slice(0, 50) + ellipsis
    : undefined;
  return (
    <ListItemButton
      selected={selectedId === it.id}
      aria-current={selectedId === it.id}
      data-testid="category-column-row"
      onClick={() => onSelect(it)}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          mr: 1.5,
          bgcolor: 'primary.main',
          fontSize: 16,
        }}
        src={avatarSrc}
        alt=""
      >
        {materialIcon || textIcon || it.name[0]}
      </Avatar>
      <ListItemText
        primary={
          <Stack direction="row" spacing={0.5} sx={{
            alignItems: "center"
          }}>
            <Typography variant="body2" sx={{
              fontWeight: 500
            }}>
              {it.name}
            </Typography>
            {it.is_system && (
              <Chip label="system" size="small" sx={{ height: 16, fontSize: 10 }} />
            )}
            {!it.is_active && (
              <Chip
                label="inactive"
                size="small"
                color="warning"
                sx={{ height: 16, fontSize: 10 }}
              />
            )}
          </Stack>
        }
        secondary={secondaryText}
      />
      <Stack direction="row">
        <DuncitIconButton
          size="small"
          aria-label={t('shell.a11y.editNamed', { vars: { name: it.name } })}
          data-testid="category-column-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(it);
          }}
        >
          <EditIcon fontSize="inherit" />
        </DuncitIconButton>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.a11y.deleteNamed', { vars: { name: it.name } })}
          data-testid="category-column-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(it);
          }}
        >
          <DeleteIcon fontSize="inherit" />
        </DuncitIconButton>
        {level !== 'SUB' && <ChevronRightIcon fontSize="small" />}
      </Stack>
    </ListItemButton>
  );
}
