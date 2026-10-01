/**
 * Completed projects — exactly the projects published on the current site
 * (projects page + yacht-clubs page). Only facts that exist there are stored:
 * title, direction, photos, video. No location / year / scope: the source has none.
 */
import type { ImageMetadata } from 'astro';
import { media } from './media';
import { videos } from './site';
import type { DirectionId } from './routes';

const galleryFiles = import.meta.glob<{ default: ImageMetadata }>('../assets/gallery/*/*.jpg', { eager: true });

function galleryOf(slug: string): ImageMetadata[] {
  return Object.entries(galleryFiles)
    .filter(([file]) => file.includes(`/gallery/${slug}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, mod]) => mod.default);
}

export interface Project {
  slug: string;
  /** Short title used in cards */
  title: string;
  /** Title as published on the old site (typos corrected) */
  fullTitle: string;
  category: string;
  directions: DirectionId[];
  cover: ImageMetadata;
  video: string | null;
  gallery: ImageMetadata[];
}

export const projects: Project[] = [
  {
    slug: 'ukriplennya-berega-betonni-pontony',
    title: 'Укріплення берега бетоном і бетонні понтони',
    fullTitle: 'Укріплення берега бетоном та бетонні понтони',
    category: 'Гідротехніка · Будівництво на воді',
    directions: ['hydro', 'water'],
    cover: media.projShore,
    video: videos.shore,
    gallery: galleryOf('ukriplennya-berega-betonni-pontony'),
  },
  {
    slug: 'yakht-klub',
    title: 'Яхт-клуб',
    fullTitle: 'Яхт-клуб — реалізований проєкт',
    category: 'Будівництво на воді',
    directions: ['water'],
    cover: media.projYacht,
    video: null,
    gallery: galleryOf('yakht-klub'),
  },
  {
    slug: 'peresadka-derev',
    title: 'Пересадка крупномірних дерев механізованим способом',
    fullTitle: 'Пересадка крупномірних дерев механізованим напівавтоматичним способом',
    category: 'Пересадка дерев',
    directions: ['trees'],
    cover: media.projTrees,
    video: videos.trees,
    gallery: galleryOf('peresadka-derev'),
  },
  {
    slug: 'pirsy',
    title: 'Підхід до водойми — пірси',
    fullTitle: 'Підхід до водойми (пірси)',
    category: 'Будівництво на воді',
    directions: ['water'],
    cover: media.projPiers,
    video: videos.piers,
    gallery: galleryOf('pirsy'),
  },
];

export const projectsFor = (direction: DirectionId) => projects.filter((p) => p.directions.includes(direction));
