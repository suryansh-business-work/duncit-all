/** Fields side by side from a small tablet up; stacked on a phone. */
export const TWO_COLUMNS = { display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } } as const;

export const THREE_COLUMNS = { display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } } as const;
