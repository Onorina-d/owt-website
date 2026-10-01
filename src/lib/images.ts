/**
 * One place for responsive image generation, so <Img> and <link rel="preload">
 * always produce identical URLs.
 * AVIF first (smallest at equal visual quality), WebP second, JPEG fallback.
 */
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export const QUALITY = { avif: 58, webp: 76, jpg: 78 } as const;

/** Widths for full-bleed media. Capped at 2048: beyond that the bytes grow fast and the gain is invisible. */
export const FULL_BLEED = [640, 960, 1280, 1600, 2048];
/** Widths for portrait (phone) hero frames. */
export const PORTRAIT = [480, 720, 960, 1200];
/** Media query that selects the portrait hero frame. */
export const PHONE_MEDIA = '(max-width: 767px)';

export async function responsive(src: ImageMetadata, widths: number[]) {
  const ws = widths.filter((w) => w <= src.width);
  if (!ws.length) ws.push(src.width);
  const [avif, webp, fallback] = await Promise.all([
    getImage({ src, widths: ws, format: 'avif', quality: QUALITY.avif }),
    getImage({ src, widths: ws, format: 'webp', quality: QUALITY.webp }),
    getImage({ src, width: Math.min(1280, src.width), format: 'jpg', quality: QUALITY.jpg }),
  ]);
  return {
    avif: avif.srcSet.attribute,
    webp: webp.srcSet.attribute,
    fallback: fallback.src,
    width: src.width,
    height: src.height,
  };
}
