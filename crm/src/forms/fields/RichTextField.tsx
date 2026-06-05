import { useEffect } from 'react';
import { Box, IconButton, Stack, Tooltip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface Props {
  /** Current HTML value. Controlled component — pass `''` for empty. */
  value: string;
  /** Called with the new HTML + a stripped plaintext snapshot. */
  onChange: (next: { html: string; text: string }) => void;
  placeholder?: string;
  /** Compact mode reduces the toolbar's vertical padding. */
  compact?: boolean;
  disabled?: boolean;
  /** Read-only mode renders the rich text without the toolbar. */
  readOnly?: boolean;
  /** Borderless, auto-height rendering (for inline/chat display). */
  bare?: boolean;
}

const ToolbarButton = ({
  active,
  label,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Tooltip title={label}>
    <span>
      <IconButton
        size="small"
        onMouseDown={(e) => {
          // Prevent the editor losing focus on toolbar click.
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
        color={active ? 'primary' : 'default'}
        sx={{ borderRadius: 1 }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

function Toolbar({ editor, compact }: { editor: Editor; compact?: boolean }) {
  const promptLink = () => {
    const current = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Link URL', current);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.25}
      flexWrap="wrap"
      useFlexGap
      sx={(theme) => ({
        borderBottom: `1px solid ${theme.palette.divider}`,
        // Light tint so the toolbar reads as a continuation of the editor
        // surface, not a heavy grey bar (previous `alpha 0.5` looked broken
        // on light theme — see PFA screenshot).
        bgcolor: alpha(theme.palette.action.hover, 0.08),
        px: 0.75,
        py: compact ? 0.25 : 0.5,
      })}
    >
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <FormatBoldIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <FormatItalicIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <FormatStrikethroughIcon fontSize="small" />
      </ToolbarButton>
      <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', mx: 0.5 }} />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <FormatListBulletedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <FormatListNumberedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <FormatQuoteIcon fontSize="small" />
      </ToolbarButton>
      <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', mx: 0.5 }} />
      <ToolbarButton label="Add link" active={editor.isActive('link')} onClick={promptLink}>
        <LinkIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Remove link"
        onClick={() => editor.chain().focus().unsetLink().run()}
        disabled={!editor.isActive('link')}
      >
        <LinkOffIcon fontSize="small" />
      </ToolbarButton>
      <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', mx: 0.5 }} />
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <UndoIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <RedoIcon fontSize="small" />
      </ToolbarButton>
    </Stack>
  );
}

/**
 * Tiptap-backed WYSIWYG editor wrapped in MUI chrome. Stays controlled by
 * keeping the HTML in `value` and reporting both `html` + `text` (plain
 * fallback) on every change. Read-only mode renders the same nodes without
 * the toolbar — handy for showing a saved manual log inline.
 */
export default function RichTextField({
  value,
  onChange,
  placeholder = 'Write your note…',
  compact,
  disabled,
  readOnly,
  bare,
}: Props) {
  const theme = useTheme();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noreferrer', target: '_blank' },
      }),
    ],
    content: value || '',
    editable: !readOnly && !disabled,
    onUpdate({ editor: e }) {
      const html = e.getHTML();
      const text = e.getText();
      onChange({ html: html === '<p></p>' ? '' : html, text });
    },
    editorProps: {
      attributes: {
        // `placeholder` is a CSS-data-attribute trick — see ::before below.
        'data-placeholder': placeholder,
      },
    },
  });

  // Allow upstream `value` resets (e.g. after submit clears the form) to
  // flow back into the editor without remounting.
  useEffect(() => {
    if (!editor) return;
    if ((editor.getHTML() || '') !== (value || '') && (value || '') !== '<p></p>') {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <Box
      sx={(t) => ({
        border: bare ? 'none' : `1px solid ${t.palette.divider}`,
        borderRadius: bare ? 0 : 1,
        bgcolor: bare ? 'transparent' : t.palette.background.paper,
        // Style the prosemirror surface from outside.
        '& .ProseMirror': {
          minHeight: bare ? 0 : compact ? 80 : 140,
          padding: bare ? t.spacing(1, 1.25) : t.spacing(1.25),
          outline: 'none',
          fontFamily: t.typography.body2.fontFamily,
          fontSize: t.typography.body2.fontSize,
          lineHeight: 1.5,
          color: t.palette.text.primary,
        },
        '& .ProseMirror p.is-editor-empty:first-of-type::before': {
          content: 'attr(data-placeholder)',
          color: t.palette.text.disabled,
          float: 'left',
          height: 0,
          pointerEvents: 'none',
        },
        '& .ProseMirror a': {
          color: t.palette.primary.main,
          textDecoration: 'underline',
        },
        '& .ProseMirror blockquote': {
          borderLeft: `3px solid ${t.palette.divider}`,
          paddingLeft: t.spacing(1.25),
          color: t.palette.text.secondary,
          margin: 0,
        },
        '& .ProseMirror ul, & .ProseMirror ol': { paddingLeft: t.spacing(2.5) },
        '& .ProseMirror > :first-of-type': { marginTop: 0 },
        '& .ProseMirror > :last-of-type': { marginBottom: 0 },
      })}
    >
      {!readOnly && <Toolbar editor={editor} compact={compact} />}
      <EditorContent editor={editor} />
      {/* `theme` is referenced via sx callbacks; keep the linter happy. */}
      {theme ? null : null}
    </Box>
  );
}
