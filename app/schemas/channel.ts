import z from "zod";

export function transformChannelName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+|-$/g, "-")
    .replace(/^-|-$/g, "");
}

export const channelNameSchema = z.object({
  name: z
    .string()
    .min(2, "Channel name must be at least 2 chars")
    .max(50, "Channel name must be at most 50 chars")
    .transform((name, ctx) => {
      const transformed = transformChannelName(name);
      if (transformed.length < 2) {
        ctx.addIssue({
          code: "custom",
          message:
            "Channel name must contains at least 2 chars after transformation",
        });
        return z.NEVER;
      }
      return transformed;
    }),
});

export type ChannelNameSchemaType = z.infer<typeof channelNameSchema>;
