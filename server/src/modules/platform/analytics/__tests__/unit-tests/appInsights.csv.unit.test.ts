import {
  dayOf,
  decodeReport,
  normalizeHeading,
  parseDelimited,
  reportRows,
  separatorOf,
} from '../../appInsights/appInsights.csv';

/** Text as Google writes it: UTF-16LE with a byte-order mark. */
const utf16le = (text: string) => new Uint8Array([0xff, 0xfe, ...Buffer.from(text, 'utf16le')]);

describe('decodeReport', () => {
  it('reads UTF-16LE with a byte-order mark (Google Play bulk reports)', () => {
    expect(decodeReport(utf16le('Date,Package Name\n2026-05-01,com.duncit.mobile'))).toBe(
      'Date,Package Name\n2026-05-01,com.duncit.mobile'
    );
  });

  it('reads UTF-16BE with a byte-order mark', () => {
    const be = Buffer.from('Date', 'utf16le').swap16();
    expect(decodeReport(new Uint8Array([0xfe, 0xff, ...be]))).toBe('Date');
  });

  it('reads UTF-8 and drops its byte-order mark', () => {
    expect(decodeReport(new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('Ünïcode')]))).toBe('Ünïcode');
  });
});

describe('separatorOf', () => {
  it('picks a tab when the header line has one (Apple segments), a comma otherwise', () => {
    expect(separatorOf('Date\tCounts\n2026-05-01\t3')).toBe('\t');
    expect(separatorOf('Date,Counts\n2026-05-01\t3')).toBe(',');
    expect(separatorOf('Date')).toBe(',');
  });
});

describe('parseDelimited', () => {
  it('keeps commas, doubled quotes and line breaks inside quoted fields (review text)', () => {
    const text = 'Star Rating,Review Text\r\n5,"Great, really ""great""\nlove it"\r\n1,meh\r\n';
    expect(parseDelimited(text)).toEqual([
      ['Star Rating', 'Review Text'],
      ['5', 'Great, really "great"\nlove it'],
      ['1', 'meh'],
    ]);
  });

  it('skips blank lines and keeps a last row with no trailing newline', () => {
    expect(parseDelimited('a,b\n\n1,2\n\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('keeps empty fields between separators', () => {
    expect(parseDelimited('a\tb\tc\n1\t\t3', '\t')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('reads an empty file as no rows', () => {
    expect(parseDelimited('')).toEqual([]);
  });
});

describe('reportRows', () => {
  const text = 'Date,Daily User Installs,Total Average Rating,Country\n2026-05-01,"1,204",NA, in \n';

  it('finds a column by its heading whatever its case, spacing and punctuation', () => {
    const [row] = reportRows(text);
    expect(row?.text('date')).toBe('2026-05-01');
    expect(row?.num('DAILY-USER-INSTALLS')).toBe(1204);
  });

  it('answers with the first heading the file has, and blank / null for one it lacks', () => {
    const [row] = reportRows(text);
    expect(row?.text('Region', 'Country')).toBe('in');
    expect(row?.text('Nope')).toBe('');
    expect(row?.num('Nope')).toBeNull();
  });

  it('reads a cell that is not a number as null, not 0', () => {
    expect(reportRows(text)[0]?.num('Total Average Rating')).toBeNull();
  });

  it('reads a file with only a header, or nothing, as no rows', () => {
    expect(reportRows('Date,Counts\n')).toEqual([]);
    expect(reportRows('')).toEqual([]);
  });
});

describe('normalizeHeading / dayOf', () => {
  it('reduces a heading to lower-case letters and digits', () => {
    expect(normalizeHeading('Daily ANRs (count)')).toBe('dailyanrscount');
  });

  it('reads the calendar day off a date or a timestamp, and null for anything else', () => {
    expect(dayOf('2026-05-01')).toBe('2026-05-01');
    expect(dayOf(' 2026-05-01T23:10:00-07:00')).toBe('2026-05-01');
    expect(dayOf('May 1, 2026')).toBeNull();
    expect(dayOf('')).toBeNull();
  });
});
