/** Non-translatable company data. Source of truth: owt.com.ua (2026). */

export const phones = [
  { display: '+38 067 39 40 000', href: 'tel:+380673940000' },
  { display: '+38 067 24 00 166', href: 'tel:+380672400166' },
] as const;

export const messengers = [
  { id: 'telegram', label: 'Telegram', href: 'https://t.me/owtservise' },
  { id: 'viber', label: 'Viber', href: 'viber://add?number=380673940000' },
  { id: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/380673940000' },
] as const;

export const socials = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61572688768782' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/owtservices/' },
  { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@owt.services' },
  { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@OWT_SERVISE' },
] as const;

/** YouTube videos published on the current projects page. */
export const videos = {
  trees: '_9W6M4X11x0',
  shore: 'jidXqotHg2Q',
  piers: 'Cu3XcgyD_eY',
} as const;

export type VideoId = (typeof videos)[keyof typeof videos];
