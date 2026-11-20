import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Reuse the Astro Markdown ecosystem at request time; no client-side Markdown
// fetches, so articles remain indexable and new slugs work without a rebuild.
const processor = createMarkdownProcessor({
  syntaxHighlight: false,
  remarkPlugins: [remarkGfm, remarkMath],
  rehypePlugins: [rehypeKatex],
});

export async function renderCmsMarkdown(markdown: string) {
  const output = await processor.render(markdown);
  return { html: output.code, headings: output.metadata.headings ?? [] };
}
