import type { Viewport } from './types';

export const VIEWPORTS: Viewport[] = [
  { name: 'Desktop', slug: 'desktop', width: 1440, height: 900, category: 'desktop' },
  { name: 'Laptop', slug: 'laptop', width: 1280, height: 800, category: 'desktop' },
  { name: 'iPad Landscape', slug: 'ipad-landscape', width: 1194, height: 834, category: 'tablet' },
  { name: 'iPad Portrait', slug: 'ipad-portrait', width: 834, height: 1194, category: 'tablet' },
  { name: 'iPhone 15 Pro', slug: 'iphone-15', width: 393, height: 852, category: 'mobile' },
  { name: 'Android (Pixel 7)', slug: 'pixel-7', width: 412, height: 915, category: 'mobile' },
];

/** Build a capture viewport that matches the uploaded design dimensions exactly. */
export function viewportFromDesign(width: number, height: number): Viewport {
  const category: Viewport['category'] =
    width < 500 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  return {
    name: `Design size (${width}×${height})`,
    slug: `design-${width}x${height}`,
    width,
    height,
    category,
  };
}
