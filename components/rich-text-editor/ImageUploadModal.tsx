import { UploadDropzone } from "@/lib/uploadthing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";

interface ImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (url: string) => void;
}

export function ImageUploadModal({
  onOpenChange,
  open,
  onUploaded,
}: ImageUploadModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
          <DialogDescription>Upload or drop a image here</DialogDescription>
        </DialogHeader>
        <UploadDropzone
          appearance={{
            container: "bg-card",
            label: "text-muted-foreground",
            allowedContent: "text-xs text-muted-foreground",
            button: "bg-primary text-primary-foreground hover:bg-primary/90",
            uploadIcon: "text-muted-foreground",
          }}
          endpoint={"imageUploader"}
          onClientUploadComplete={(res) => {
            const url = res[0].ufsUrl;

            toast.success(`Image uploaded Succesfully`);
            onUploaded(url);
            console.log("uploaded url: ", url);
          }}
          onUploadError={(error) => {
            toast.error(error.message);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
