import { Box } from '@mui/material';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote'],
    ['link'],
    ['clean'],
  ],
};

/** react-quill wrapper used to author document + policy content. */
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 320 }: Readonly<Props>) {
  return (
    <Box
      sx={{
        '& .ql-toolbar': { borderTopLeftRadius: 8, borderTopRightRadius: 8, borderColor: 'divider' },
        '& .ql-container': {
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          borderColor: 'divider',
          fontFamily: 'inherit',
          fontSize: 14,
          minHeight,
        },
        '& .ql-editor': { minHeight },
      }}
    >
      <ReactQuill theme="snow" value={value} onChange={onChange} placeholder={placeholder} modules={MODULES} />
    </Box>
  );
}

/** Strips HTML tags to a plain-text string (for copy + previews). */
export function htmlToText(html: string): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').trim();
}

/** A printable HTML document wrapper for Print / Download. */
export function toPrintableHtml(title: string, contentHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title>` +
    `<style>body{font-family:Arial,Helvetica,sans-serif;max-width:800px;margin:32px auto;padding:0 16px;line-height:1.5;color:#111}h1{font-size:22px}</style>` +
    `</head><body><h1>${title}</h1>${contentHtml || '<p><em>No content.</em></p>'}</body></html>`;
}
