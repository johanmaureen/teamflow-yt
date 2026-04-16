import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Image from "next/image";

interface AttachmentChipProps {
  url: string;
  onRemove: () => void;
}

export function AttachmentChip({ url, onRemove }: AttachmentChipProps) {
  return (
    <div className="group relative overflow-hidden rounded-md bg-muted size-12">
      <Image
        src={url}
        alt="attached image"
        fill
        loading="eager"
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
        <Button
          onClick={onRemove}
          type="button"
          variant="destructive"
          className="size-6 p-0 rounded-full"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
