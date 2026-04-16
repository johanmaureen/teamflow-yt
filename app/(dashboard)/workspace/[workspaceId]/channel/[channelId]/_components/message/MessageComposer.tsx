import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { ImageUploadModal } from "@/components/rich-text-editor/ImageUploadModal";
import { Button } from "@/components/ui/button";
import { UseAttachmentUploadType } from "@/hooks/use-attachment-upload";
import { ImageIcon, Send } from "lucide-react";
import { AttachmentChip } from "./AttachmentChip";

interface iAppProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  upload: UseAttachmentUploadType;
}

export function MessageComposer({
  onChange,
  value,
  onSubmit,
  isSubmitting,
  upload,
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
          upload.stagedUrl ? (
            <AttachmentChip url={upload.stagedUrl} onRemove={upload.clear} />
          ) : (
            <Button
              onClick={() => upload.setOpen(true)}
              type="button"
              size="sm"
              variant="outline"
            >
              <ImageIcon className="size-4 mr-1" />
              Attach
            </Button>
          )
        }
      />
      <ImageUploadModal
        open={upload.isOpen}
        onOpenChange={upload.setOpen}
        onUploaded={(url) => upload.onUploaded(url)}
      />
    </>
  );
}
