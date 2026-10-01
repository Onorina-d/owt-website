/**
 * Work archive — small photos from the galleries of the old site’s service
 * sub-pages (originals are 640×400, so they are only ever shown small).
 */
import type { ImageMetadata } from 'astro';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/archive/*/*.jpg', { eager: true });

export type ArchiveGroup = 'hydro-dig' | 'hydro-shore' | 'hydro-demolition' | 'water-pontoons' | 'fleet';

export function archive(group: ArchiveGroup): ImageMetadata[] {
  return Object.entries(files)
    .filter(([file]) => file.includes(`/archive/${group}/`))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, mod]) => mod.default);
}
