import z from "zod";
//import { heavyWriteSecurityMiddleware } from "../middlewares/arcjet/heavy-write";
import { standardSecurityMiddleware } from "../middlewares/arcjet/standard";
import { requireAuthMiddleware } from "../middlewares/auth";
import { base } from "../middlewares/base";
import { requireWorkspaceMiddleware } from "../middlewares/workspace";
import { Message } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { writeSecurityMiddleware } from "../middlewares/arcjet/write";
import {
  createMessageSchema,
  groupedReactionSchema,
  GroupedReactionSchemaType,
  toggleReactionSchema,
  updateMessageSchema,
} from "../schemas/message";
import { getAvatar } from "@/lib/get-avatar";
import { readSecurityMiddleware } from "../middlewares/arcjet/read";
import { MessageListItem } from "@/lib/types";

type MessageWithCount = Message & {
  _count: {
    replies: number;
  };
  MessageReaction: {
    emoji: string;
    userId: string;
  }[];
};

function groupReactions(
  reactions: {
    emoji: string;
    userId: string;
  }[],
  userId: string,
): GroupedReactionSchemaType[] {
  const reactionMap = new Map<
    string,
    { count: number; reactedByMe: boolean }
  >();
  for (const reaction of reactions) {
    const existing = reactionMap.get(reaction.emoji);
    if (existing) {
      existing.count++;
      if (reaction.userId === userId) {
        existing.reactedByMe = true;
      }
    } else {
      reactionMap.set(reaction.emoji, {
        count: 1,
        reactedByMe: reaction.userId === userId,
      });
    }
  }
  return Array.from(reactionMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reactedByMe: data.reactedByMe,
  }));
}

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
        MessageReaction: {
          select: {
            emoji: true,
            userId: true,
          },
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
      replyCount: m._count.replies,
      reactions: groupReactions(
        m.MessageReaction.map((r) => ({
          emoji: r.emoji,
          userId: r.userId,
        })),
        context.user.id,
      ),
    }));

    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : undefined;

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
      parent: z.custom<MessageListItem>(),
      messages: z.array(z.custom<MessageListItem>()),
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
      include: {
        _count: {
          select: {
            replies: true,
          },
        },
        MessageReaction: {
          select: {
            emoji: true,
            userId: true,
          },
        },
      },
    });
    if (!parentRow) {
      throw errors.NOT_FOUND();
    }
    // fetch all thread replies
    const messagesQuery = (await prisma.message.findMany({
      where: {
        threadId: input.messageId,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        _count: {
          select: {
            replies: true,
          },
        },
        MessageReaction: {
          select: {
            emoji: true,
            userId: true,
          },
        },
      },
    })) as MessageWithCount[];
    const parent: MessageListItem = {
      id: parentRow.id,
      content: parentRow.content,
      imageUrl: parentRow.imageUrl,
      authorAvatar: parentRow.authorAvatar,
      authorEmail: parentRow.authorEmail,
      authorId: parentRow.authorId,
      authorName: parentRow.authorName,
      channelId: parentRow.channelId,
      createdAt: parentRow.createdAt,
      updatedAt: parentRow.updatedAt,
      threadId: parentRow.threadId,
      replyCount: parentRow._count.replies,
      reactions: groupReactions(
        parentRow.MessageReaction.map((r) => ({
          emoji: r.emoji,
          userId: r.userId,
        })),
        context.user.id,
      ),
    };

    const messages: MessageListItem[] = messagesQuery.map((m) => ({
      id: m.id,
      content: m.content,
      imageUrl: m.imageUrl,
      authorAvatar: m.authorAvatar,
      authorEmail: m.authorEmail,
      authorId: m.authorId,
      authorName: m.authorName,
      channelId: m.channelId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      threadId: m.threadId,
      replyCount: m._count.replies,
      reactions: groupReactions(
        m.MessageReaction.map((r) => ({
          emoji: r.emoji,
          userId: r.userId,
        })),
        context.user.id,
      ),
    }));

    return {
      parent,
      messages,
    };
  });

export const toogleReaction = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(writeSecurityMiddleware)
  .route({
    method: "POST",
    path: "/messages/:messageId/reactions",
    summary: "Toggle a Reaction",
    tags: ["Messages"],
  })
  .input(toggleReactionSchema)
  .output(
    z.object({
      messageId: z.string(),
      reactions: z.array(groupedReactionSchema),
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
      },
    });
    if (!message) {
      throw errors.NOT_FOUND();
    }

    const inserted = await prisma.messageReaction.createMany({
      data: {
        emoji: input.emoji,
        messageId: input.messageId,
        userId: context.user.id,
        userName: context.user.given_name ?? "John Fisher",
        userAvatar: getAvatar(context.user.picture, context.user.email!),
        userEmail: context.user.email!,
      },
      skipDuplicates: true,
    });

    if (inserted.count === 0) {
      await prisma.messageReaction.deleteMany({
        where: {
          messageId: input.messageId,
          userId: context.user.id,
          emoji: input.emoji,
        },
      });
    }
    const updated = await prisma.message.findUnique({
      where: {
        id: input.messageId,
      },
      include: {
        MessageReaction: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!updated) {
      throw errors.NOT_FOUND();
    }

    return {
      messageId: updated.id,
      reactions: groupReactions(
        (updated.MessageReaction ?? []).map((r) => ({
          emoji: r.emoji,
          userId: r.userId,
        })),
        context.user.id,
      ),
    };
  });
