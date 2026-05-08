export interface FormState {
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}

export const emptyForm: FormState = {
  slug: '',
  title: '',
  content: '',
  is_active: true,
  sort_order: 0,
};

export const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};

export const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'indent',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
