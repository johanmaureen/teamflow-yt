import { SafeContent } from "@/components/rich-text-editor/SafeContent";
import Image from "next/image";
import { ReactionsBar } from "../reaction/ReactionsBar";
import { MessageListItem } from "@/lib/types";

interface ThreadReplyProps {
  message: MessageListItem;
  selectedThreadId: string;
}

export function ThreadReply({ message, selectedThreadId }: ThreadReplyProps) {
  return (
    <div className="flex space-x-3 p-3 hover:bg-muted/30 rounded-lg">
      <Image
        alt="Author Avatar"
        src={message.authorAvatar}
        width={32}
        height={32}
        className="size-8 rounded-full shrink-0"
      />
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm">{message.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("en-US", {
              hour12: true,
              hour: "numeric",
              minute: "numeric",
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(message.createdAt)}
          </span>
        </div>
        <SafeContent
          content={JSON.parse(message.content)}
          className="text-sm wrap-break-word prose dark:prose-invert max-w-none marker:text-primary"
        />
        {message.imageUrl && (
          <div className="mt-2">
            <Image
              src={message.imageUrl}
              width={512}
              height={512}
              alt="message attachment"
              className="rounded-md max-h-80 w-auto object-contain "
            />
          </div>
        )}
        <ReactionsBar
          context={{ type: "thread", threadId: selectedThreadId }}
          reactions={message.reactions}
          messageId={message.id}
        />
      </div>
    </div>
  );
}
