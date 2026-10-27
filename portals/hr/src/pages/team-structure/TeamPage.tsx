import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RedoIcon from '@mui/icons-material/Redo';
import ShareIcon from '@mui/icons-material/Share';
import UndoIcon from '@mui/icons-material/Undo';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import CostSummary from './CostSummary';
import SeatCanvas from './SeatCanvas';
import SeatDrawer from './SeatDrawer';
import ShareDialog from './ShareDialog';
import { useTeamStructure } from './useTeamStructure';
import type { NodeDraft, TeamNode } from './types';

type Drawer = { parentId: string | null } | null;

/** True for typing targets, where Ctrl+Z must stay the browser's own text undo. */
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** One team's chart: add, edit, re-parent and delete seats, with undo and redo. */
export default function TeamPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const team = useTeamStructure(id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Drawer>(null);
  const [sharing, setSharing] = useState(false);

  const { undo, redo } = team;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || !(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) undo();
      else if (key === 'y' || (key === 'z' && event.shiftKey)) redo();
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  if (team.loading) return <CircularProgress aria-label={t('hr.teamStructure.loading')} />;
  if (team.error || !team.structure) return <Alert severity="error">{t('hr.teamStructure.loadFailed')}</Alert>;

  const selected = team.nodes.find((n) => n.id === selectedId) ?? null;
  const open = Boolean(selected) || adding !== null;
  const closeDrawer = () => {
    setSelectedId(null);
    setAdding(null);
  };
  const nextOrder = (parentId: string | null) => team.nodes.filter((n) => n.parent_id === parentId).length;

  const onSave = async (draft: NodeDraft) => {
    await team.saveSeat(draft);
    closeDrawer();
  };
  const onDelete = async (node: TeamNode) => {
    const ok = await confirm({ title: t('hr.teamStructure.seat.deleteTitle', { vars: { title: node.title } }), message: t('hr.teamStructure.seat.deleteMessage'), destructive: true });
    if (!ok) return;
    await team.removeSeat(node.id);
    closeDrawer();
  };
  const onReparent = (childId: string, parentId: string) => {
    const child = team.nodes.find((n) => n.id === childId);
    if (child && child.parent_id !== parentId) {
      team.saveSeat({ ...child, parent_id: parentId, sort_order: nextOrder(parentId), pay: child.pay ?? [] });
    }
  };

  return (
    <Stack spacing={1.5} sx={{ height: 'calc(100vh - 140px)', minHeight: 560 }}>
      <PageHeader title={team.structure.name} subtitle={team.structure.description ?? undefined} />
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/team-structure')}>{t('hr.teamStructure.back')}</DuncitButton>
        <DuncitIconButton aria-label={t('hr.teamStructure.undo')} disabled={!team.canUndo || team.busy} onClick={undo}><UndoIcon /></DuncitIconButton>
        <DuncitIconButton aria-label={t('hr.teamStructure.redo')} disabled={!team.canRedo || team.busy} onClick={redo}><RedoIcon /></DuncitIconButton>
        <DuncitButton variant="outlined" startIcon={<AddIcon />} onClick={() => setAdding({ parentId: null })}>{t('hr.teamStructure.addSeat')}</DuncitButton>
        <DuncitButton variant="contained" startIcon={<ShareIcon />} onClick={() => setSharing(true)}>{t('hr.teamStructure.share.button')}</DuncitButton>
        <Box sx={{ flex: 1 }} />
        <CostSummary nodes={team.nodes} currency={team.structure.currency} />
      </Stack>
      {team.nodes.length === 0 && <Alert severity="info">{t('hr.teamStructure.emptyChart')}</Alert>}
      <Box sx={{ flex: 1, border: 1, borderColor: 'divider' }}>
        <SeatCanvas
          nodes={team.nodes}
          currency={team.structure.currency}
          selectedId={selectedId}
          onSelect={(next) => { setAdding(null); setSelectedId(next); }}
          onAddChild={(parentId) => { setSelectedId(null); setAdding({ parentId }); }}
          onReparent={onReparent}
        />
      </Box>
      <SeatDrawer
        open={open}
        node={selected}
        parentId={adding?.parentId ?? null}
        currency={team.structure.currency}
        nextOrder={nextOrder(adding?.parentId ?? null)}
        busy={team.busy}
        onClose={closeDrawer}
        onSave={onSave}
        onDelete={onDelete}
      />
      <ShareDialog structureId={id} open={sharing} onClose={() => setSharing(false)} />
    </Stack>
  );
}
