import { Box } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CodeIcon from '@mui/icons-material/Code';
import { DuncitTabs, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import EmailPreviewFrame from '../../components/EmailPreviewFrame';
import VariablesTab from './VariablesTab';
import type { Tpl } from './queries';

export type PaneTab = 'preview' | 'code';

/** The strip, as data — the editor hook reads the same list to validate the URL. */
type Translate = ReturnType<typeof useTranslation>['t'];

export const paneTabs = (t: Translate): DuncitTabItem<PaneTab>[] => [
  {
    value: 'preview',
    label: t('tech.common.preview'),
    icon: <VisibilityIcon fontSize="small" />,
    iconPosition: 'start',
    sx: { minHeight: 40 },
  },
  {
    value: 'code',
    label: t('tech.common.variables'),
    icon: <CodeIcon fontSize="small" />,
    iconPosition: 'start',
    sx: { minHeight: 40 },
  },
];

interface Props {
  draft: Tpl;
  setDraft: (t: Tpl) => void;
  tab: PaneTab;
  setTab: (v: PaneTab) => void;
  previewHtml: string;
  previewErrors: string[];
  /** True from the keystroke that changed the MJML until the render lands. */
  previewLoading: boolean;
  detected: string[];
  varsJson: string;
  setVarsJson: (v: string) => void;
  onImportDetected: () => void;
}

export default function PreviewVariablesPane({
  draft,
  setDraft,
  tab,
  setTab,
  previewHtml,
  previewErrors,
  previewLoading,
  detected,
  varsJson,
  setVarsJson,
  onImportDetected,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
      <DuncitTabs
        items={paneTabs(t)}
        value={tab}
        onChange={setTab}
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}
      />
      {tab === 'preview' ? (
        <EmailPreviewFrame
          title={t('tech.common.preview')}
          html={previewHtml}
          errors={previewErrors}
          loading={previewLoading}
        />
      ) : (
        <VariablesTab
          draft={draft}
          setDraft={setDraft}
          detected={detected}
          varsJson={varsJson}
          setVarsJson={setVarsJson}
          onImportDetected={onImportDetected}
        />
      )}
    </Box>
  );
}
