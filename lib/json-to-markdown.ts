import { baseExtensions } from "@/components/rich-text-editor/extensions";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";

function normalizeWhiteSpace(markdown: string) {
  return markdown
    .replace(/\s+$/gm, "")
    .replace(/\n{3.}/g, "\n\n")
    .trim();
}

export async function tipTapJsonToMarkdown(json: string) {
  // parse json
  let content;
  try {
    content = JSON.parse(json);
  } catch {
    content = "";
  }
  const markdown = renderToMarkdown({
    extensions: baseExtensions,
    content: content,
  });
  return normalizeWhiteSpace(markdown);
}
