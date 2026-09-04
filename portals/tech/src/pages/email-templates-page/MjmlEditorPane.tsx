import { lazy, Suspense, useState } from 'react';
import { Box, CircularProgress, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import Editor from '@monaco-editor/react';
import BrushIcon from '@mui/icons-material/Brush';
import CodeIcon from '@mui/icons-material/Code';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import { DuncitIconButton } from '@duncit/buttons';
import MjmlAiButton from '../../components/MjmlAiButton';
import { formatMjml } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

// Kept out of the page bundle: grapesjs and mjml-browser together are larger
// than the rest of this console, and only this pane ever wants them.
const MjmlDesignPane = lazy(() => import('./MjmlDesignPane'));

/** Which half of the editor is on screen. The MJML is the same either way. */
export type MjmlView = 'code' | 'design';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onValidate: () => void;
}

export default function MjmlEditorPane({ value, onChange, onValidate }: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<MjmlView>('code');
  const designing = view === 'design';

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          // A toggle group returns null when the pressed button is the active
          // one; keeping the current view is what makes that a no-op rather
          // than an empty editor.
          onChange={(_, next: MjmlView | null) => setView(next ?? view)}
          aria-label={t('tech.emailTemplates.viewLabel')}
        >
          <ToggleButton value="code" aria-label={t('tech.emailTemplates.viewCode')}>
            <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('tech.emailTemplates.viewCode')}
          </ToggleButton>
          <ToggleButton value="design" aria-label={t('tech.emailTemplates.viewDesign')}>
            <BrushIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('tech.emailTemplates.viewDesign')}
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {designing ? t('tech.emailTemplates.designerTitle') : t('tech.emailTemplates.sourceTitle')}
        </Typography>
        {/* Formatting and verifying act on the source, so they belong to the
            code view; the designer writes well-formed MJML on its own. */}
        {!designing && (
          <>
            <Tooltip title={t('tech.common.formatMjml')}>
              <DuncitIconButton size="small" onClick={() => onChange(formatMjml(value))}>
                <FormatAlignLeftIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
            <Tooltip title={t('tech.emailTemplates.verifyMjml')}>
              <DuncitIconButton size="small" onClick={onValidate}>
                <FactCheckIcon fontSize="small" />
              </DuncitIconButton>
            </Tooltip>
            <MjmlAiButton iconOnly currentMjml={value} onApply={onChange} />
          </>
        )}
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {designing ? (
          <Suspense fallback={<PaneSpinner />}>
            <MjmlDesignPane value={value} onChange={onChange} />
          </Suspense>
        ) : (
          <Editor
            height="100%"
            defaultLanguage="html"
            value={value}
            onChange={(v) => onChange(v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              formatOnPaste: true,
              tabSize: 2,
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function PaneSpinner() {
  return (
    <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={24} />
    </Stack>
  );
}
