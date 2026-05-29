export function pickBestVideoFile(v: any) {
  const files = (v.video_files || []) as any[];
  if (!files.length) return null;
  const sorted = [...files].sort((a, b) => {
    const aHd = a.quality === 'hd' ? 1 : 0;
    const bHd = b.quality === 'hd' ? 1 : 0;
    if (aHd !== bHd) return bHd - aHd;
    return (b.width || 0) - (a.width || 0);
  });
  const reasonable = sorted.find((f) => (f.height || 0) <= 1080) || sorted[0];
  return reasonable;
}
