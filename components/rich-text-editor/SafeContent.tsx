import { convertJsonToHtml } from "@/lib/json-to-html";
import { type JSONContent } from "@tiptap/react";
import DOMpurify from "dompurify";
import parse from "html-react-parser";

interface iAppProps {
  content: JSONContent;
}
export function SafeContent({ content }: iAppProps) {
  const html = convertJsonToHtml(content);
  const clean = DOMpurify.sanitize(html);

  return <div>{parse(clean)}</div>;
}
