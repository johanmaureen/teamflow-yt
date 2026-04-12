import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Button } from "@/components/ui/button";
import { ImageIcon, Send } from "lucide-react";

interface iAppProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function MessageComposer({
  onChange,
  value,
  onSubmit,
  isSubmitting,
}: iAppProps) {
  return (
    <>
      <RichTextEditor
        field={{ value, onChange }}
        sendBottun={
          <Button
            disabled={isSubmitting}
            onClick={onSubmit}
            type="button"
            size="sm"
          >
            <Send className="size-4 mr-1" />
            {isSubmitting ? "Sending.." : "Send"}
          </Button>
        }
        footerLeft={
          <Button type="button" size="sm" variant="outline">
            <ImageIcon className="size-4 mr-1" />
            Attach
          </Button>
        }
      />
    </>
  );
}
