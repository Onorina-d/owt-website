/** Every internal URL in one place, so links never drift from the pages. */
import type { TopicId } from '../i18n/uk';

export const routes = {
  home: '/',
  services: '/posluhy/',
  hydro: '/posluhy/hidrotekhnika/',
  water: '/posluhy/budivnytstvo-na-vodi/',
  trees: '/posluhy/peresadka-derev/',
  fleet: '/tekhnika/',
  projects: '/proekty/',
  project: (slug: string) => `/proekty/${slug}/`,
  about: '/pro-kompaniiu/',
  contacts: '/kontakty/',
  /** Contact form, optionally with a pre-selected topic. */
  request: (topic?: TopicId) => `/kontakty/${topic ? `?topic=${topic}` : ''}#request`,
} as const;

/** Directions (service pages) in display order. */
export const directionLinks = [
  { id: 'hydro', href: routes.hydro, label: 'Гідротехнічні роботи', topic: 'hydro' },
  { id: 'water', href: routes.water, label: 'Будівництво на воді', topic: 'yacht' },
  { id: 'trees', href: routes.trees, label: 'Пересадка великих дерев', topic: 'trees' },
] as const;

export type DirectionId = (typeof directionLinks)[number]['id'];
