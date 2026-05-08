// Inline Lottie animation data — kept inline to avoid bundling JSON files.
// Two animations: payment success (checkmark in circle) and processing (pulsing dots).
// These are hand-crafted Bodymovin-format JSON kept minimal for fast load.

export const PAYMENT_SUCCESS_LOTTIE = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'success',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0, 100], h: 0, i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
            { t: 25, s: [110, 110, 100] },
            { t: 35, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              d: 1,
              ty: 'el',
              s: { a: 0, k: [140, 140] },
              p: { a: 0, k: [0, 0] },
            },
            { ty: 'fl', c: { a: 0, k: [0.196, 0.804, 0.404, 1] }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, o: { a: 0, k: 100 } },
          ],
          nm: 'g',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'check',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ind: 0,
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  i: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  o: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  v: [
                    [-32, 4],
                    [-8, 28],
                    [36, -22],
                  ],
                  c: false,
                },
              },
            },
            {
              ty: 'tm',
              s: { a: 0, k: 0 },
              e: {
                a: 1,
                k: [
                  { t: 18, s: [0], h: 0, i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
                  { t: 45, s: [100] },
                ],
              },
              o: { a: 0, k: 0 },
              m: 1,
            },
            {
              ty: 'st',
              c: { a: 0, k: [1, 1, 1, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 14 },
              lc: 2,
              lj: 2,
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, o: { a: 0, k: 100 } },
          ],
          nm: 'check',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};

export const PAYMENT_PROCESSING_LOTTIE = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 120,
  h: 40,
  nm: 'loading',
  ddd: 0,
  assets: [],
  layers: [0, 1, 2].map((i) => ({
    ddd: 0,
    ind: i + 1,
    ty: 4,
    nm: `dot${i}`,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: i * 8, s: [40], h: 0, i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
          { t: i * 8 + 15, s: [100] },
          { t: i * 8 + 30, s: [40] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [20 + i * 35, 20, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: i * 8, s: [60, 60, 100], h: 0, i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
          { t: i * 8 + 15, s: [110, 110, 100] },
          { t: i * 8 + 30, s: [60, 60, 100] },
        ],
      },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          { d: 1, ty: 'el', s: { a: 0, k: [22, 22] }, p: { a: 0, k: [0, 0] } },
          { ty: 'fl', c: { a: 0, k: [0.345, 0.337, 0.839, 1] }, o: { a: 0, k: 100 } },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, o: { a: 0, k: 100 } },
        ],
        nm: 'g',
      },
    ],
    ip: 0,
    op: 60,
    st: 0,
    bm: 0,
  })),
};
