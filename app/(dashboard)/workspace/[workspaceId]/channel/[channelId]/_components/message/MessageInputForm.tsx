"use client";
import {
  createMessageSchema,
  CreateMessageSchemaType,
} from "@/app/schemas/message";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MessageComposer } from "./MessageComposer";
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

interface iAppProps {
  channelId: string;
}

export function MessageInputForm({ channelId }: iAppProps) {
  const form = useForm({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createMessageSchema as any),
    defaultValues: {
      channelId: channelId,
      content: "",
    },
  });

  const createMessageMutation = useMutation(
    orpc.message.create.mutationOptions({
      onSuccess: () => {
        return toast.success("Message created succesfully!");
      },
      onError: () => toast.error("failed to create message"),
    }),
  );

  function onSubmit(data: CreateMessageSchemaType) {
    createMessageMutation.mutate(data);
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
//<RichTextEditor />;
