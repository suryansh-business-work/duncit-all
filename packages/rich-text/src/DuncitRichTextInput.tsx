import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box } from '@mui/material';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { useTranslation } from '@duncit/app-settings';
import { normalizedEditorHtml } from './html';
import {
  IMPROVE_RICH_TEXT,
  type ImproveRichTextData,
  type ImproveRichTextVariables,
} from './operations';
import { RichTextActions } from './RichTextActions';
import { RichTextToolbar } from './RichTextToolbar';
import type { DuncitRichTextInputProps, RichTextChangeHandler } from './types';

function emitValue(editor: Editor, onChange: RichTextChangeHandler): void {
  onChange(normalizedEditorHtml(editor.getHTML()), editor.getText().trim());
}

export function DuncitRichTextInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  minHeight = 160,
  compact = false,
  disabled = false,
  readOnly = false,
  bare = false,
  aiContext,
}: Readonly<DuncitRichTextInputProps>) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('shell.richText.placeholder');
  const [aiError, setAiError] = useState(false);
  const [improve, { loading }] = useMutation<ImproveRichTextData, ImproveRichTextVariables>(
    IMPROVE_RICH_TEXT,
  );
  const extensions = useMemo(
    () => [
      // Link and Underline are configured HERE rather than added beside the
      // kit: StarterKit 3 bundles both, and registering one twice makes tiptap
      // keep the FIRST registration and drop this configuration silently — so
      // openOnClick and the rel/target attributes were not being applied at
      // all, and setLink stopped working on a selection.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          autolink: true,
          openOnClick: readOnly,
          HTMLAttributes: { rel: 'noreferrer', target: '_blank' },
        },
      }),
      // TableKit registers all four table nodes at once (table, row, header,
      // cell). StarterKit does NOT bundle them, so unlike Link and Underline
      // above there is no double-registration to avoid here.
      //
      // Column resizing is on for an editable editor only: the resize handles
      // are drag targets, and a read-only document should not offer them.
      TableKit.configure({ table: { resizable: !readOnly } }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
    ],
    [readOnly, resolvedPlaceholder],
  );
  const editor = useEditor({
    content: value || '',
    editable: !readOnly && !disabled,
    extensions,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => emitValue(current, onChange),
    editorProps: {
      attributes: {
        'aria-label': ariaLabel ?? t('shell.richText.editorLabel'),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly && !disabled);
  }, [disabled, editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const next = value || '';
    if (normalizedEditorHtml(editor.getHTML()) !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const improveContent = async () => {
    setAiError(false);
    try {
      const result = await improve({
        variables: {
          input: { html: editor.getHTML(), context: aiContext ?? null },
        },
      });
      const improved = result.data?.aiImproveRichText.trim();
      if (!improved) {
        setAiError(true);
        return;
      }
      editor.commands.setContent(improved, { emitUpdate: false });
      emitValue(editor, onChange);
    } catch {
      setAiError(true);
    }
  };

  const editable = !readOnly && !disabled;
  return (
    <Box
      sx={(theme) => ({
        bgcolor: bare ? 'transparent' : 'background.paper',
        border: bare ? 0 : 1,
        borderColor: 'divider',
        borderRadius: bare ? 0 : 2,
        color: bare ? 'inherit' : 'text.primary',
        overflow: 'hidden',
        '& .ProseMirror': {
          caretColor: theme.palette.primary.main,
          color: bare ? 'inherit' : theme.palette.text.primary,
          fontFamily: theme.typography.body2.fontFamily,
          fontSize: theme.typography.body2.fontSize,
          lineHeight: 1.6,
          minHeight: bare ? 0 : minHeight,
          outline: 'none',
          overflowWrap: 'anywhere',
          padding: bare ? theme.spacing(1, 1.25) : theme.spacing(1.5),
        },
        '& .tiptap p.is-editor-empty:first-of-type::before': {
          color: theme.palette.text.disabled,
          content: 'attr(data-placeholder)',
          float: 'left',
          height: 0,
          pointerEvents: 'none',
        },
        '& .ProseMirror a': {
          color: 'primary.main',
          textDecoration: 'underline',
        },
        '& .ProseMirror blockquote': {
          borderLeft: 3,
          borderColor: 'divider',
          color: 'text.secondary',
          margin: 0,
          paddingLeft: 1.25,
        },
        '& .ProseMirror ul, & .ProseMirror ol': { paddingLeft: 3 },
        // A table is the one block that can outgrow the editor, so it scrolls
        // inside its own box rather than making the whole page scroll sideways.
        '& .ProseMirror .tableWrapper': { overflowX: 'auto', maxWidth: '100%', my: 1 },
        '& .ProseMirror table': {
          borderCollapse: 'collapse',
          margin: 0,
          tableLayout: 'fixed',
          width: '100%',
        },
        '& .ProseMirror th, & .ProseMirror td': {
          border: 1,
          borderColor: 'divider',
          padding: theme.spacing(0.75, 1),
          position: 'relative',
          verticalAlign: 'top',
          minWidth: 48,
        },
        '& .ProseMirror th': {
          bgcolor: 'action.hover',
          fontWeight: 700,
          textAlign: 'left',
        },
        // Cell content is a paragraph like any other block, so without this a
        // one-line cell carries a paragraph's bottom margin.
        '& .ProseMirror th > p, & .ProseMirror td > p': { m: 0 },
        // ProseMirror marks the cells covered by a selection; without this the
        // multi-cell selection a merge acts on is invisible.
        '& .ProseMirror .selectedCell::after': {
          background: theme.palette.action.selected,
          bottom: 0,
          content: '""',
          left: 0,
          pointerEvents: 'none',
          position: 'absolute',
          right: 0,
          top: 0,
          zIndex: 2,
        },
        '& .ProseMirror .column-resize-handle': {
          backgroundColor: theme.palette.primary.main,
          bottom: -2,
          pointerEvents: 'none',
          position: 'absolute',
          right: -1,
          top: 0,
          width: 2,
        },
        '& .ProseMirror > :first-of-type': { marginTop: 0 },
        '& .ProseMirror > :last-of-type': { marginBottom: 0 },
      })}
    >
      {editable ? <RichTextToolbar compact={compact} editor={editor} /> : null}
      <EditorContent editor={editor} />
      {editable ? (
        <RichTextActions
          disabled={!editor.getText().trim()}
          error={aiError}
          loading={loading}
          onImprove={() => {
            improveContent().catch(() => setAiError(true));
          }}
        />
      ) : null}
    </Box>
  );
}
