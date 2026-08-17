import { useState } from 'react';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import RedoIcon from '@mui/icons-material/Redo';
import TitleIcon from '@mui/icons-material/Title';
import UndoIcon from '@mui/icons-material/Undo';
import { Box, Divider } from '@mui/material';
import type { Editor } from '@tiptap/react';
import { useTranslation } from '@duncit/app-settings';
import { LinkDialog } from './LinkDialog';
import { ToolbarButton } from './ToolbarButton';

interface Props {
  compact: boolean;
  editor: Editor;
}

const DIVIDER_SX = { display: { xs: 'none', sm: 'block' }, mx: 0.25 };

export function RichTextToolbar({ compact, editor }: Readonly<Props>) {
  const { t } = useTranslation();
  const [linkOpen, setLinkOpen] = useState(false);
  const run = (command: () => boolean) => command();
  const label = (name: string) => t(`shell.richText.${name}`);

  return (
    <>
      <Box
        role="toolbar"
        aria-label={label('toolbarLabel')}
        sx={{
          alignItems: 'center',
          bgcolor: 'action.hover',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.25,
          minHeight: 44,
          px: 0.75,
          py: compact ? 0.25 : 0.5,
        }}
      >
        <ToolbarButton
          label={label('bold')}
          active={editor.isActive('bold')}
          onPress={() => run(() => editor.chain().focus().toggleBold().run())}
        >
          <FormatBoldIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('italic')}
          active={editor.isActive('italic')}
          onPress={() => run(() => editor.chain().focus().toggleItalic().run())}
        >
          <FormatItalicIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('underline')}
          active={editor.isActive('underline')}
          onPress={() => run(() => editor.chain().focus().toggleUnderline().run())}
        >
          <FormatUnderlinedIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('strike')}
          active={editor.isActive('strike')}
          onPress={() => run(() => editor.chain().focus().toggleStrike().run())}
        >
          <FormatStrikethroughIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('heading')}
          active={editor.isActive('heading', { level: 2 })}
          onPress={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        >
          <TitleIcon fontSize="small" />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={DIVIDER_SX} />
        <ToolbarButton
          label={label('bulletList')}
          active={editor.isActive('bulletList')}
          onPress={() => run(() => editor.chain().focus().toggleBulletList().run())}
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('numberedList')}
          active={editor.isActive('orderedList')}
          onPress={() => run(() => editor.chain().focus().toggleOrderedList().run())}
        >
          <FormatListNumberedIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('quote')}
          active={editor.isActive('blockquote')}
          onPress={() => run(() => editor.chain().focus().toggleBlockquote().run())}
        >
          <FormatQuoteIcon fontSize="small" />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={DIVIDER_SX} />
        <ToolbarButton
          label={label('addLink')}
          active={editor.isActive('link')}
          onPress={() => setLinkOpen(true)}
        >
          <LinkIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('removeLink')}
          disabled={!editor.isActive('link')}
          onPress={() => run(() => editor.chain().focus().unsetLink().run())}
        >
          <LinkOffIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('clearFormatting')}
          onPress={() => run(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}
        >
          <FormatClearIcon fontSize="small" />
        </ToolbarButton>
        <Divider orientation="vertical" flexItem sx={DIVIDER_SX} />
        <ToolbarButton
          label={label('undo')}
          disabled={!editor.can().undo()}
          onPress={() => run(() => editor.chain().focus().undo().run())}
        >
          <UndoIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          label={label('redo')}
          disabled={!editor.can().redo()}
          onPress={() => run(() => editor.chain().focus().redo().run())}
        >
          <RedoIcon fontSize="small" />
        </ToolbarButton>
      </Box>
      <LinkDialog
        currentUrl={String(editor.getAttributes('link').href ?? '')}
        open={linkOpen}
        onApply={(url) => {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          setLinkOpen(false);
        }}
        onClose={() => setLinkOpen(false)}
      />
    </>
  );
}
