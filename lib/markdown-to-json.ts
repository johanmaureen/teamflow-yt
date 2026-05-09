import MarkdownIt from "markdown-it";
import DOMpurify from "dompurify";
import { generateJSON } from "@tiptap/react";
import { editorExtensions } from "@/components/rich-text-editor/extensions";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
});

export function markdownToJson(markdown: string) {
  const html = md.render(markdown);
  const cleanHtml = DOMpurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
  return generateJSON(cleanHtml, editorExtensions);
}
