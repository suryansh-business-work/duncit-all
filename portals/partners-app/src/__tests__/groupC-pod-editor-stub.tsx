/**
 * A stand-in for `@duncit/pod-form`'s full-page `PodEditorPage`.
 *
 * The editor (eight sections, a slot calendar, a live preview) has its own
 * suite in the package. A page that mounts it decides only what it is seeded
 * with and what happens on save, back and media pick — so this shows the seed
 * and exposes one button per callback. Save submits the seed unchanged.
 *
 * Use it with
 *   vi.mock(import('@duncit/pod-form'), async (importOriginal) => ({
 *     ...(await importOriginal()),
 *     PodEditorPage: (await import('<rel>/__tests__/groupC-pod-editor-stub')).PodEditorStub,
 *   }));
 */
import { useState } from 'react';
import type { PodEditorPageProps } from '@duncit/pod-form';

export function PodEditorStub({
  editing,
  title,
  eyebrow,
  backLabel,
  intro,
  initialValues,
  busy,
  error,
  onBack,
  onSubmit,
  onPickImage,
}: Readonly<PodEditorPageProps>) {
  const [picked, setPicked] = useState('');
  const defaultHeading = editing ? 'Edit Pod' : 'New Pod';
  const pickImage = () => {
    onPickImage?.().then((url) => setPicked(url ?? 'Nothing picked'));
  };
  return (
    <main aria-busy={busy}>
      <p>{eyebrow}</p>
      <h1>{title ?? defaultHeading}</h1>
      {intro}
      <p>{`Seeded title: ${initialValues.pod_title}`}</p>
      <p>{`Seeded category: ${initialValues.super_category_id} / ${initialValues.sub_category_id}`}</p>
      <p>{`Seeded club: ${initialValues.club_id}`}</p>
      {error && <p>{error}</p>}
      {picked && <p>{`Picked: ${picked}`}</p>}
      <button type="button" onClick={onBack}>
        {backLabel}
      </button>
      <button type="button" onClick={() => onSubmit(initialValues, { draft: false })}>
        Save pod
      </button>
      <button type="button" onClick={() => onSubmit(initialValues, { draft: true })}>
        Save pod draft
      </button>
      <button type="button" onClick={pickImage}>
        Add image
      </button>
    </main>
  );
}
