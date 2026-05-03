"use client";
import {
  createMessageSchema,
  CreateMessageSchemaType,
} from "@/app/schemas/message";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { MessageComposer } from "../message/MessageComposer";
import { useAttachmentUpload } from "@/hooks/use-attachment-upload";
import { useEffect, useState } from "react";
import {
  InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import { Message } from "@/lib/generated/prisma/client";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs";
import { getAvatar } from "@/lib/get-avatar";
import { MessageListItem } from "@/lib/types";

interface ThreadReplyFormProps {
  threadId: string;
  user: KindeUser<Record<string, unknown>>;
}

export function ThreadReplyForm({ threadId, user }: ThreadReplyFormProps) {
  const { channelId } = useParams<{ channelId: string }>();
  const upload = useAttachmentUpload();
  const [editorKey, setEditorKey] = useState(0);
  const queryClient = useQueryClient();
  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createMessageSchema as any),
    defaultValues: {
      content: "",
      channelId: channelId,
      threadId: threadId,
    },
  });

  useEffect(() => {
    form.setValue("threadId", threadId);
  }, [threadId, form]);

  const createMessageMutation = useMutation(
    orpc.message.create.mutationOptions({
      onMutate: async (data) => {
        const listOptions = orpc.message.thread.list.queryOptions({
          input: {
            messageId: threadId,
          },
        });
        type MessagePage = {
          items: Array<MessageListItem>;
          nextCursor?: string;
        };

        type InfiniteMassages = InfiniteData<MessagePage>;

        await queryClient.cancelQueries({
          queryKey: listOptions.queryKey,
        });
        const previous = queryClient.getQueryData(listOptions.queryKey);
        const optimistic: Message = {
          id: `optimistic-${crypto.randomUUID()}`,
          content: data.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          authorId: user.id,
          authorEmail: user.email!,
          authorName: user.given_name ?? "John Fisher",
          authorAvatar: getAvatar(user.picture, user.email!),
          channelId: data.channelId,
          threadId: data.threadId!,
          imageUrl: data.imageUrl ?? null,
        };
        queryClient.setQueryData(listOptions.queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...old.messages, optimistic],
          };
        });
        // optimistic bump replies count in main message list for the parent message
        queryClient.setQueryData<InfiniteMassages>(
          ["message.list", channelId],
          (old) => {
            if (!old) return old;
            const pages = old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === threadId ? { ...m, replyCount: m.replyCount + 1 } : m,
              ),
            }));
            return { ...old, pages };
          },
        );
        return {
          listOptions,
          previous,
        };
      },
      onSuccess: (_data, _vars, ctx) => {
        queryClient.invalidateQueries({ queryKey: ctx.listOptions.queryKey });
        form.reset({ channelId, content: "", threadId });
        upload.clear();

        setEditorKey((k) => k + 1);
        return toast.success("Thread message created successfully!");
      },
      onError: (_er, _vars, ctx) => {
        if (!ctx) return;
        const { listOptions, previous } = ctx;
        if (previous) {
          queryClient.setQueryData(listOptions.queryKey, previous);
        }
        return toast.error("Somehting went wrong!");
      },
    }),
  );
  function onSubmit(data: CreateMessageSchemaType) {
    createMessageMutation.mutate({
      ...data,
      imageUrl: upload.stagedUrl ?? undefined,
    });
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <MessageComposer
                  value={field.value}
                  onChange={field.onChange}
                  upload={upload}
                  key={editorKey}
                  onSubmit={() => onSubmit(form.getValues())}
                  isSubmitting={createMessageMutation.isPending}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
