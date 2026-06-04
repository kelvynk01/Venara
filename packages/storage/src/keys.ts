/**
 * keys.ts — the single registry of R2 object key layouts (Brief §7/§10).
 *
 * Keys are prefixed by workspaceId so the layout is tenant-segmented at the path level
 * (defense in depth beyond signed-URL expiry, and ready for path-based bucket policies).
 * Centralized so capture, render, and storage never drift on a path.
 */

export const storageKeys = {
  capture: (workspaceId: string, captureId: string) => ({
    // Browserbase delivers recordings as HLS/fMP4; the capture worker transcodes to MP4.
    raw: `workspaces/${workspaceId}/captures/${captureId}/raw.mp4`,
    dom: `workspaces/${workspaceId}/captures/${captureId}/dom.json`,
    visual: `workspaces/${workspaceId}/captures/${captureId}/visual.png`,
  }),
  render: (workspaceId: string, renderId: string) => ({
    mp4: `workspaces/${workspaceId}/renders/${renderId}/video.mp4`,
    thumb: `workspaces/${workspaceId}/renders/${renderId}/thumb.jpg`,
    captions: `workspaces/${workspaceId}/renders/${renderId}/captions.vtt`,
  }),
} as const;
