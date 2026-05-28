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
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

/** Thin react-quill wrapper used for composing ticket replies. */
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 140 }: Props) {
  return (
    <Box
      sx={{
        '& .ql-container': { minHeight, fontSize: 14, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
        '& .ql-toolbar': { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
        '& .ql-editor': { minHeight },
      }}
    >
      <ReactQuill theme="snow" value={value} onChange={onChange} placeholder={placeholder} modules={MODULES} />
    </Box>
  );
}

/** Strips HTML tags to derive a plain-text body for search / previews. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').replace(/ /g, ' ').trim();
}
