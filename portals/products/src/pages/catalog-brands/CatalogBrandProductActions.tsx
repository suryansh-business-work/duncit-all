import { IconButton, Stack, Tooltip } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import type { CatalogBrandProductRow } from './queries';

interface Props {
  product: CatalogBrandProductRow;
  onEdit: (p: CatalogBrandProductRow) => void;
  /** Archive an active product, restore an archived one. */
  onLifecycle: (p: CatalogBrandProductRow) => void;
  onDuplicate: (p: CatalogBrandProductRow) => void;
}

/**
 * Row actions for a brand's product. Every handler stops propagation so the
 * table's row-click (which opens the editor) does not also fire.
 */
export default function CatalogBrandProductActions({
  product,
  onEdit,
  onLifecycle,
  onDuplicate,
}: Readonly<Props>) {
  const archived = product.status === 'ARCHIVED';
  const lifecycleLabel = archived ? 'Restore' : 'Archive';
  const lifecycleIcon = archived ? (
    <UnarchiveIcon fontSize="small" />
  ) : (
    <ArchiveIcon fontSize="small" />
  );

  return (
    <Stack direction="row" justifyContent="flex-end" component="span">
      <Tooltip title="Edit">
        <IconButton
          size="small"
          aria-label="Edit"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(product);
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={lifecycleLabel}>
        <IconButton
          size="small"
          aria-label={lifecycleLabel}
          onClick={(event) => {
            event.stopPropagation();
            onLifecycle(product);
          }}
        >
          {lifecycleIcon}
        </IconButton>
      </Tooltip>
      <Tooltip title="Duplicate">
        <IconButton
          size="small"
          aria-label="Duplicate"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate(product);
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
