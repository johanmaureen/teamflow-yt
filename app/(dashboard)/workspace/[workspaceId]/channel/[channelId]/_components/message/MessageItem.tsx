import { SafeContent } from "@/components/rich-text-editor/SafeContent";
import { Message } from "@/lib/generated/prisma/client";
import { getAvatar } from "@/lib/get-avatar";
import Image from "next/image";
import { MessageHoverToolbar } from "../../../../_components/toolbar";
import { useState } from "react";
import { EditMessage } from "../../../../_components/toolbar/EditMessage";

interface iAppProps {
  message: Message;
  currentUserId: string;
}

export function MessageItem({ message, currentUserId }: iAppProps) {
  const [isEdditing, setIsEdditing] = useState(false);
  return (
    <div className="flex space-x-3 relative p-3 rounded-lg group hover:bg-muted/50">
      <Image
        src={getAvatar(message.authorAvatar, message.authorEmail)}
        alt="User Avatar"
        width={32}
        height={32}
        loading="eager"
        className="size-8 rounded-lg"
      />

      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-x-2">
          <p className="font-medium leading-none">{message.authorName}</p>
          <p className="text-xs text-muted-foreground leading-none">
            {new Intl.DateTimeFormat("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(message.createdAt)}{" "}
            {new Intl.DateTimeFormat("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            }).format(message.createdAt)}
          </p>
        </div>
        {isEdditing ? (
          <EditMessage
            message={message}
            onCancel={() => setIsEdditing(false)}
            onSave={() => setIsEdditing(false)}
          />
        ) : (
          <>
            <SafeContent
              className="text-sm wrap-break-word prose dark:prose-invert max-w-none mark:text-primary"
              content={JSON.parse(message.content)}
            />
            <div className="mt-3">
              {message.imageUrl && (
                <Image
                  src={message.imageUrl}
                  alt="message attach"
                  width={512}
                  height={512}
                  loading="eager"
                  className="ronded-md max-h-80 w-auto object-contain"
                />
              )}
            </div>
          </>
        )}
      </div>
      <MessageHoverToolbar
        canEdit={message.authorId === currentUserId}
        messageId={message.id}
        onEdit={() => setIsEdditing(true)}
      />
    </div>
  );
}
