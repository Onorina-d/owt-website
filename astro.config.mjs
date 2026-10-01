// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.owt.com.ua',
  i18n: {
    defaultLocale: 'uk',
    locales: ['uk', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  // Old owt.com.ua URLs → new pages (keeps inbound links and search equity)
  redirects: {
    '/uslugi': '/posluhy/',
    '/uslugi/services': '/posluhy/hidrotekhnika/',
    '/uslugi/tree-transplant': '/posluhy/peresadka-derev/',
    '/uslugi/tree-transplant/tree_transplanting': '/posluhy/peresadka-derev/',
    '/uslugi/orenda-tehniki': '/tekhnika/',
    '/uslugi/yaht-klubi': '/posluhy/budivnytstvo-na-vodi/',
    '/uslugi/doma-na-vodi': '/posluhy/budivnytstvo-na-vodi/',
    '/uslugi/proektuvannya-ta-montazh-obladnannya': '/proekty/',
    '/uslugi-2': '/posluhy/',
    '/uslugi-2/gidrotehnicheskie-raboty': '/posluhy/hidrotekhnika/',
    '/uslugi-2/orenda-tehniki': '/tekhnika/',
    '/uslugi-2/yaht-klubi': '/posluhy/budivnytstvo-na-vodi/',
    '/uslugi-2/doma-na-vodi': '/posluhy/budivnytstvo-na-vodi/',
    '/kopka-chistka-vodojm-2': '/posluhy/hidrotekhnika/',
    '/ochistka-vodoym': '/posluhy/hidrotekhnika/',
    '/beregoukriplennya': '/posluhy/hidrotekhnika/',
    '/beregoukreplenie': '/posluhy/hidrotekhnika/',
    '/ukriplennya-shiliv': '/posluhy/hidrotekhnika/',
    '/zmicznennya-shiliv': '/posluhy/hidrotekhnika/',
    '/demontazh-sporud': '/posluhy/hidrotekhnika/',
    '/pontoni-prichali-pirsi': '/posluhy/budivnytstvo-na-vodi/',
    '/pontoni-prichali-pirsi-2': '/posluhy/budivnytstvo-na-vodi/',
    '/glavnaya-english': '/en/',
    '/thank-you': '/kontakty/',
  },
  image: {
    responsiveStyles: false,
  },
  // Site CSS is small (~12 KB gz in total): inline it so nothing blocks the first paint.
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
