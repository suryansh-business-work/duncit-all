import type { SxProps, Theme } from '@mui/material/styles';

/**
 * The editor's frame and everything ProseMirror draws inside it.
 *
 * `bare` is the borderless rendering a chat message uses; `minHeight` only
 * applies to the framed editor.
 */
export const editorFrameSx =
  (bare: boolean, minHeight: number): SxProps<Theme> =>
  (theme) => ({
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
    // The browser outline is off above (it hugged the text, not the box), so
    // the focused document draws its own ring inside the frame (WCAG 2.4.7).
    '& .ProseMirror:focus-visible': {
      boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
    },
    '& .tiptap p.is-editor-empty:first-of-type::before': {
      // Placeholder text is text: secondary keeps it at 4.5:1 (WCAG 1.4.3).
      color: theme.palette.text.secondary,
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
    // A phone photo is 4000px wide, so it is told to behave rather than
    // being trusted to.
    '& .ProseMirror img': {
      borderRadius: 4,
      display: 'block',
      height: 'auto',
      margin: theme.spacing(1, 0),
      maxWidth: '100%',
    },
    // ProseMirror rings the selected node. Without this an image the caret is
    // on looks identical to one it is not, and Delete feels like it misfired.
    '& .ProseMirror img.ProseMirror-selectednode': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
    '& .ProseMirror > :first-of-type': { marginTop: 0 },
    '& .ProseMirror > :last-of-type': { marginBottom: 0 },
  });
