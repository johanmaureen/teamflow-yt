import z from "zod";
//import { heavyWriteSecurityMiddleware } from "../middlewares/arcjet/heavy-write";
import { standardSecurityMiddleware } from "../middlewares/arcjet/standard";
import { requireAuthMiddleware } from "../middlewares/auth";
import { base } from "../middlewares/base";
import { requireWorkspaceMiddleware } from "../middlewares/workspace";
import { Message } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { writeSecurityMiddleware } from "../middlewares/arcjet/write";
import { createMessageSchema } from "../schemas/message";
import { getAvatar } from "@/lib/get-avatar";
import { readSecurityMiddleware } from "../middlewares/arcjet/read";

export const createMessage = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(writeSecurityMiddleware)
  .route({
    method: "POST",
    path: "/messages",
    summary: "Create a new Message",
    tags: ["Messages"],
  })
  .input(createMessageSchema)
  .output(z.custom<Message>())
  .handler(async ({ context, input, errors }) => {
    // verify that the channel belongs to the user organizatio
    const channel = await prisma.channel.findFirst({
      where: {
        id: input.channelId,
        workspaceId: context.workspace.orgCode,
      },
    });

    if (!channel) {
      throw errors.FORBIDDEN();
    }

    try {
      const created = await prisma.message.create({
        data: {
          content: input.content,
          imageUrl: input.imageUrl,
          channelId: input.channelId,
          authorId: context.user.id,
          authorEmail: context.user.email!,
          authorName: context.user.given_name ?? "John Doe",
          authorAvatar: getAvatar(context.user.picture, context.user.email!),
        },
      });
      //console.log("created message: ", created);
      return {
        ...created,
      };
    } catch (error) {
      const prismaError =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string; meta?: unknown; clientVersion?: string })
          : null;
      console.error("Prisma channel.create failed", {
        workspace: context.workspace,
        orgCode: context.workspace.orgCode,
        input,
        code: prismaError?.code,
        meta: prismaError?.meta,
        clientVersion: prismaError?.clientVersion,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      });
      throw error;
    }
  });

export const listMessages = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(readSecurityMiddleware)
  .route({
    method: "GET",
    path: "/messages",
    summary: "List all Message",
    tags: ["Messages"],
  })
  .input(
    z.object({
      channelId: z.string(),
      limit: z.number().min(1).max(100).optional(),
      cursor: z.string().optional(),
    }),
  )
  .output(
    z.object({
      items: z.array(z.custom<Message>()),
      nextCursor: z.string().optional(),
    }),
  )
  .handler(async ({ context, input, errors }) => {
    // verify that the channel belongs to the user organizatio
    const channel = await prisma.channel.findFirst({
      where: {
        id: input.channelId,
        workspaceId: context.workspace.orgCode,
      },
    });

    if (!channel) {
      throw errors.FORBIDDEN();
    }

    const limit = input.limit ?? 30;

    const messages = await prisma.message.findMany({
      where: {
        channelId: input.channelId,
      },
      ...(input.cursor
        ? {
            cursor: {
              id: input.cursor,
            },
            skip: 1,
          }
        : {}),
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : undefined;

    //console.log("Messages: ", messages);

    return {
      items: messages,
      nextCursor,
    };
  });
