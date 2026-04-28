import z from "zod";
//import { heavyWriteSecurityMiddleware } from "../middlewares/arcjet/heavy-write";
import { standardSecurityMiddleware } from "../middlewares/arcjet/standard";
import { requireAuthMiddleware } from "../middlewares/auth";
import { base } from "../middlewares/base";
import { requireWorkspaceMiddleware } from "../middlewares/workspace";
import { Message } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { writeSecurityMiddleware } from "../middlewares/arcjet/write";
import { createMessageSchema, updateMessageSchema } from "../schemas/message";
import { getAvatar } from "@/lib/get-avatar";
import { readSecurityMiddleware } from "../middlewares/arcjet/read";
import { MessageListItem } from "@/lib/types";

type MessageWithCount = Message & {
  _count: {
    replies: number;
  };
};

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
    // if this is thread reply, validate the parent Message
    if (input.threadId) {
      const parentMessage = await prisma.message.findFirst({
        where: {
          id: input.threadId,
          channel: {
            workspaceId: context.workspace.orgCode,
          },
        },
      });
      if (
        !parentMessage ||
        parentMessage.channelId !== input.channelId ||
        parentMessage.threadId !== null
      ) {
        throw errors.BAD_REQUEST();
      }
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
          threadId: input.threadId,
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
      items: z.array(z.custom<MessageListItem>()),
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

    const messages = (await prisma.message.findMany({
      where: {
        channelId: input.channelId,
        threadId: null,
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
      include: {
        _count: {
          select: { replies: true },
        },
      },
    })) as MessageWithCount[];

    const items: MessageListItem[] = messages.map((m) => ({
      id: m.id,
      content: m.content,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      authorId: m.authorId,
      authorEmail: m.authorEmail,
      authorAvatar: m.authorAvatar,
      authorName: m.authorName,
      channelId: m.channelId,
      threadId: m.threadId,
      repliesCount: m._count.replies,
    }));

    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : undefined;

    //console.log("Messages: ", messages);

    return {
      items,
      nextCursor,
    };
  });

export const updateMessage = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(writeSecurityMiddleware)
  .route({
    method: "PUT",
    path: "/messages/:messageId",
    summary: "Update a Message",
    tags: ["Messages"],
  })
  .input(updateMessageSchema)
  .output(
    z.object({
      message: z.custom<Message>(),
      canEdit: z.boolean(),
    }),
  )
  .handler(async ({ context, input, errors }) => {
    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channel: {
          workspaceId: context.workspace.orgCode,
        },
      },
      select: {
        id: true,
        authorId: true,
      },
    });
    if (!message) {
      throw errors.NOT_FOUND();
    }
    if (message.authorId !== context.user.id) {
      throw errors.FORBIDDEN();
    }
    const updated = await prisma.message.update({
      where: {
        id: input.messageId,
      },
      data: {
        content: input.content,
      },
    });
    return {
      message: updated,
      canEdit: updated.authorId === context.user.id,
    };
  });

export const listThreadReplies = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(readSecurityMiddleware)
  .route({
    method: "GET",
    path: "/messages/:messageId/thread",
    summary: "List replies in athread",
    tags: ["Messages"],
  })
  .input(
    z.object({
      messageId: z.string(),
    }),
  )
  .output(
    z.object({
      parent: z.custom<Message>(),
      messages: z.array(z.custom<Message>()),
    }),
  )
  .handler(async ({ context, input, errors }) => {
    const parentRow = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channel: {
          workspaceId: context.workspace.orgCode,
        },
      },
    });
    if (!parentRow) {
      throw errors.NOT_FOUND();
    }
    // fetch all thread replies
    const replies = await prisma.message.findMany({
      where: {
        threadId: input.messageId,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const parent = {
      ...parentRow,
    };

    const messages = replies.map((r) => ({
      ...r,
    }));

    return {
      parent,
      messages,
    };
  });
