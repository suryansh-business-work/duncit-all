import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box } from '@mui/material';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { useTranslation } from '@duncit/app-settings';
import { normalizedEditorHtml } from '../html';
import {
  IMPROVE_RICH_TEXT,
  type ImproveRichTextData,
  type ImproveRichTextVariables,
} from '../operations';
import { RichTextActions } from '../RichTextActions';
import { RichTextToolbar } from '../RichTextToolbar';
import type { DuncitRichTextInputProps, RichTextChangeHandler } from '../types';
import { editorFrameSx } from './editorSx';
import { useRichTextExtensions } from './useRichTextExtensions';

/**
 * Where a picture dropped into rich text lands when the surface names no folder.
 *
 * One folder of its own rather than the ImageKit root: it keeps document images
 * clear of the venue/club/pod media every other picker writes.
 */
const DEFAULT_IMAGE_FOLDER = '/rich-text';

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
  imageFolder = DEFAULT_IMAGE_FOLDER,
}: Readonly<DuncitRichTextInputProps>) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('shell.richText.placeholder');
  const [aiError, setAiError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [improve, { loading }] = useMutation<ImproveRichTextData, ImproveRichTextVariables>(
    IMPROVE_RICH_TEXT,
  );
  const extensions = useRichTextExtensions(readOnly, resolvedPlaceholder);
  const editor = useEditor({
    content: value || '',
    editable: !readOnly && !disabled,
    extensions,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: current }) => emitValue(current, onChange),
    editorProps: {
      attributes: {
        'aria-label': ariaLabel ?? t('shell.richText.editorLabel'),
        // A contenteditable is only "editable text" to assistive tech; this
        // announces it as the multi-line field it is.
        role: 'textbox',
        'aria-multiline': 'true',
        'data-testid': 'rich-text-editor',
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
    <Box sx={editorFrameSx(bare, minHeight)}>
      {editable ? (
        <RichTextToolbar
          compact={compact}
          editor={editor}
          imageFolder={imageFolder}
          onImageError={setImageError}
        />
      ) : null}
      <EditorContent editor={editor} />
      {editable ? (
        <RichTextActions
          disabled={!editor.getText().trim()}
          error={aiError}
          imageError={imageError}
          loading={loading}
          onImprove={() => {
            improveContent().catch(() => setAiError(true));
          }}
        />
      ) : null}
    </Box>
  );
}
