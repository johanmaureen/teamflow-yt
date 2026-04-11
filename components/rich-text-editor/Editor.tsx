"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { editorExtensions } from "./extensions";
import { MenuBar } from "./MenuBar";
import { ReactNode } from "react";

interface iAppProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any;
  sendBottun: ReactNode;
  footerLeft?: ReactNode;
}

export function RichTextEditor({ field, sendBottun, footerLeft }: iAppProps) {
  const editor = useEditor({
    extensions: editorExtensions,
    immediatelyRender: false,
    content: (() => {
      if (!field?.value) {
        return "";
      }
      try {
        return JSON.parse(field.value);
      } catch {
        return "";
      }
    })(),
    onUpdate: ({ editor }) => {
      if (field?.onChange) {
        field.onChange(JSON.stringify(editor.getJSON()));
      }
    },
    editorProps: {
      attributes: {
        class:
          "max-w-none min-h-[125px] focus:outline-none p-4 prose dark:prose-invert marker:text-primary  !w-full !max-w-none",
      },
    },
  });

  return (
    <div className="relative w-full border border-input rounded-lg overflow-hidden dark:bh-input/30 flex flex-col">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="max-h-50 overflow-y-auto" />
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-t border-input bg-card">
        <div className="m-h-8 items-center">{footerLeft}</div>
        <div className="shrink-0">{sendBottun}</div>
      </div>
    </div>
  );
}
