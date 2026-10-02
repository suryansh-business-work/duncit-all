import { useMemo } from 'react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';

/** The tiptap extension set, rebuilt only when what configures it changes. */
export function useRichTextExtensions(readOnly: boolean, resolvedPlaceholder: string) {
  return useMemo(
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
      // Pictures. `inline: false` keeps an image its own block, which is what
      // makes it selectable and deletable with a caret rather than behaving like
      // an enormous character inside a paragraph. `allowBase64` stays OFF: every
      // picture is uploaded to ImageKit and stored as a URL, so a data: URI in
      // the saved HTML would be a megabyte of document nobody can cache.
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: resolvedPlaceholder }),
    ],
    [readOnly, resolvedPlaceholder],
  );
}
