import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { blogFrontmatterSchema } from './lib/content/frontmatter-schema';
import { workFrontmatterSchema } from './lib/content/work-frontmatter-schema';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// ulbo Article Manager contract: strict fields with conditional draft validation.
	schema: blogFrontmatterSchema,
});

// Works share the article layout, but have no mandatory category or tags.
const works = defineCollection({
	loader: glob({ base: './src/content/works', pattern: '**/*.{md,mdx}' }),
	schema: workFrontmatterSchema,
});

export const collections = { blog, works };
