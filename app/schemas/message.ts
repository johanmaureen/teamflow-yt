import * as z from "zod";

export const createMessageSchema = z.object({
  channelId: z.string(),
  content: z.string(),
  imageUrl: z.string().optional(),
});

export type CreateMessageSchemaType = z.infer<typeof createMessageSchema>;
