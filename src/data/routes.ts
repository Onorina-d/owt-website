/** Every internal URL in one place, so links never drift from the pages. */
import type { TopicId } from '../i18n/uk';
import { withBase } from '../lib/paths';

export const routes = {
  home: withBase('/'),
  services: withBase('/posluhy/'),
  hydro: withBase('/posluhy/hidrotekhnika/'),
  water: withBase('/posluhy/budivnytstvo-na-vodi/'),
  trees: withBase('/posluhy/peresadka-derev/'),
  fleet: withBase('/tekhnika/'),
  projects: withBase('/proekty/'),
  project: (slug: string) => withBase(`/proekty/${slug}/`),
  about: withBase('/pro-kompaniiu/'),
  contacts: withBase('/kontakty/'),
  /** Contact form, optionally with a pre-selected topic. */
  request: (topic?: TopicId) => withBase(`/kontakty/${topic ? `?topic=${topic}` : ''}#request`),
} as const;

/** Directions (service pages) in display order. */
export const directionLinks = [
  { id: 'hydro', href: routes.hydro, label: 'Гідротехнічні роботи', topic: 'hydro' },
  { id: 'water', href: routes.water, label: 'Будівництво на воді', topic: 'yacht' },
  { id: 'trees', href: routes.trees, label: 'Пересадка великих дерев', topic: 'trees' },
] as const;

export type DirectionId = (typeof directionLinks)[number]['id'];
