import * as z from "zod";

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 chars")
    .max(50, "Workspace name must not belonger than 50 chars"),
});
