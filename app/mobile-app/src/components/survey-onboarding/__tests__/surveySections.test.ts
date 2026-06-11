import { splitSections } from '@/components/survey-onboarding/surveySections';

const q = (over: Record<string, unknown>) =>
  ({
    qid: 'q',
    type: 'TEXT',
    label: 'L',
    help: null,
    required: false,
    multi: false,
    options: [],
    ...over,
  }) as never;

describe('splitSections', () => {
  it('groups leading questions under the default fallback title', () => {
    const out = splitSections([q({ qid: 'a', type: 'TEXT' })]);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe('Details');
  });

  it('uses the fallback for an unlabeled section and keeps named ones', () => {
    const out = splitSections(
      [
        q({ qid: 's1', type: 'SECTION', label: '' }),
        q({ qid: 'q1', type: 'TEXT' }),
        q({ qid: 's2', type: 'SECTION', label: 'Named' }),
        q({ qid: 'q2', type: 'TEXT' }),
      ],
      'Fallback',
    );
    expect(out.map((s) => s.title)).toEqual(['Fallback', 'Named']);
  });

  it('drops sections with no input questions', () => {
    const out = splitSections([q({ qid: 's1', type: 'SECTION', label: 'Empty' })], 'F');
    expect(out).toHaveLength(0);
  });
});
