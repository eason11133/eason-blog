import defaultBackground from '../assets/blog-placeholder-1.webp';

/**
 * Hero copy and background settings for one page.
 */
export interface HeroSectionConfig {
  /**
   * Main hero headline text.
   */
  text: string;
  /**
   * Optional hero subtitle text.
   */
  subtitle?: string;
  /**
   * Hero background image URL.
   */
  backgroundImage: string;
}

/**
 * Centralized hero configuration for all top-level pages and post fallback.
 */
export interface HeroConfig {
  home: HeroSectionConfig;
  blog: HeroSectionConfig;
  tags: HeroSectionConfig;
  about: HeroSectionConfig;
  /**
   * Default hero image shared by all article pages.
   */
  postDefaultBackground: string;
}

export const heroConfig: HeroConfig = {
  home: {
    text: 'Hi 我是 Eason',
    subtitle: '',
    backgroundImage: '/ChatGPT%20%E5%9C%96%E5%83%8F%202026%E5%B9%B411%E6%9C%8812%E6%97%A5%20%E4%B8%8B%E5%8D%8803_47_57.jpg',
  },
  blog: {
    text: 'All Posts',
    subtitle: 'Browse your writing archive.',
    backgroundImage: defaultBackground.src,
  },
  tags: {
    text: 'Tags',
    subtitle: 'Explore topics by category and tag.',
    backgroundImage: defaultBackground.src,
  },
  about: {
    text: 'About',
    subtitle: 'Introduce yourself and your work.',
    backgroundImage: defaultBackground.src,
  },
  postDefaultBackground: defaultBackground.src,
};
