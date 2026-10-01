import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatStrikethroughIcon from '@mui/icons-material/FormatStrikethrough';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import TitleIcon from '@mui/icons-material/Title';
import type { Editor } from '@tiptap/react';
import { ToolbarButton } from '../ToolbarButton';
import { run } from './run';

interface Props {
  editor: Editor;
  /** The toolbar's own label lookup, so every button reads from one namespace. */
  label: (name: string) => string;
}

/** The marks a selection can carry: bold, italic, underline, strike and heading. */
export function MarkButtons({ editor, label }: Readonly<Props>) {
  return (
    <>
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
    </>
  );
}
