import { Box } from '@mui/material';
import ColumnPanel from './ColumnPanel';
import type { CatItem, Level } from './queries';

interface Props {
  superSel: CatItem | null;
  catSel: CatItem | null;
  setSuperSel: (it: CatItem | null) => void;
  setCatSel: (it: CatItem | null) => void;
  openCreate: (level: Level, parentId: string | null) => void;
  openEdit: (level: Level, parentId: string | null, item: CatItem) => void;
  remove: (level: Level, item: CatItem) => void;
}

export default function CategoriesColumns({
  superSel,
  catSel,
  setSuperSel,
  setCatSel,
  openCreate,
  openEdit,
  remove,
}: Readonly<Props>) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
        gap: 2,
        minHeight: 0,
      }}
    >
      <ColumnPanel
        title="Super Categories"
        level="SUPER"
        parentId={null}
        selectedId={superSel?.id ?? null}
        onSelect={(it) => {
          setSuperSel(it);
          setCatSel(null);
        }}
        onCreate={() => openCreate('SUPER', null)}
        onEdit={(it) => openEdit('SUPER', null, it)}
        onDelete={(it) => remove('SUPER', it)}
      />
      <ColumnPanel
        title="Categories"
        level="CATEGORY"
        parentId={superSel?.id}
        parentName={superSel?.name}
        selectedId={catSel?.id ?? null}
        onSelect={(it) => setCatSel(it)}
        onCreate={() => superSel && openCreate('CATEGORY', superSel.id)}
        onEdit={(it) => superSel && openEdit('CATEGORY', superSel.id, it)}
        onDelete={(it) => remove('CATEGORY', it)}
      />
      <ColumnPanel
        title="Sub-Categories"
        level="SUB"
        parentId={catSel?.id}
        parentName={catSel?.name}
        selectedId={null}
        onSelect={() => undefined}
        onCreate={() => catSel && openCreate('SUB', catSel.id)}
        onEdit={(it) => catSel && openEdit('SUB', catSel.id, it)}
        onDelete={(it) => remove('SUB', it)}
      />
    </Box>
  );
}
