/** Fixed design canvases; extra viewport space stays in the side margins. */
export const pageWidthForViewport = (width: number): number => {
  if (width >= 1440) return 1440;
  if (width >= 1080) return 1080;
  if (width >= 720) return 720;
  return 360;
};
