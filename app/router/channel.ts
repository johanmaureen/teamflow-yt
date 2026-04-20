import z from "zod";
import { heavyWriteSecurityMiddleware } from "../middlewares/arcjet/heavy-write";
import { standardSecurityMiddleware } from "../middlewares/arcjet/standard";
import { requireAuthMiddleware } from "../middlewares/auth";
import { base } from "../middlewares/base";
import { requireWorkspaceMiddleware } from "../middlewares/workspace";
import { channelNameSchema } from "../schemas/channel";
import { Channel } from "@/lib/generated/prisma/client";
import {
  init,
  organization_user,
  Organizations,
} from "@kinde/management-api-js";
import { KindeOrganization, KindeUser } from "@kinde-oss/kinde-auth-nextjs";
import { prisma } from "@/lib/db";
import { readSecurityMiddleware } from "../middlewares/arcjet/read";

export const createChannel = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(heavyWriteSecurityMiddleware)
  .route({
    method: "POST",
    path: "/channels",
    summary: "Create a new Channel",
    tags: ["channels"],
  })
  .input(channelNameSchema)
  .output(z.custom<Channel>())
  .handler(async ({ context, input }) => {
    /*
    console.log("workspace", context.workspace);
    console.log("orgcode", context.workspace.orgCode);
    console.log("orgCode type", typeof context.workspace.orgCode);
    console.log("input", input);
    */
    try {
      const channel = await prisma.channel.create({
        data: {
          name: input.name,
          workspaceId: context.workspace.orgCode,
          createdById: context.user.id,
        },
      });
      console.log("created channel: ", channel);
      return channel;
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

export const listChannels = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  //.use(standardSecurityMiddleware)
  //.use(heavyWriteSecurityMiddleware)
  .route({
    method: "GET",
    path: "/channels",
    summary: "List all Channel",
    tags: ["channels"],
  })
  .input(z.void())
  .output(
    z.object({
      channels: z.array(z.custom<Channel>()),
      members: z.array(z.custom<organization_user>()),
      currentWorkspace: z.custom<KindeOrganization<unknown>>(),
    }),
  )
  .handler(async ({ context }) => {
    /*
    console.log("workspace", context.workspace);
    console.log("orgcode", context.workspace.orgCode);
    console.log("orgCode type", typeof context.workspace.orgCode);
    */
    let channels = [] as Channel[];
    const startTime = Date.now();
    const queryParams = {
      workspaceId: context.workspace.orgCode as string,
      timestamp: new Date().toISOString(),
      userId: context.user.id,
    };

    //console.log("🔍 Starting channel.findMany query", queryParams);

    try {
      channels = await prisma.channel.findMany({
        where: {
          workspaceId: context.workspace.orgCode as string,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      //console.log("channels: ", channels);
    } catch (error) {
      const duration = Date.now() - startTime;
      const prismaError =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string; meta?: unknown; clientVersion?: string })
          : null;

      console.error("❌ Prisma channel.findMany failed", {
        ...queryParams,
        duration: `${duration}ms`,
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

    init();
    const usersInOrg = await Organizations.getOrganizationUsers({
      orgCode: context.workspace.orgCode,
      sort: "name_asc",
    });
    const members = usersInOrg.organization_users ?? [];

    return {
      channels,
      members,
      currentWorkspace: context.workspace,
    };
  });

export const getChannel = base
  .use(requireAuthMiddleware)
  .use(requireWorkspaceMiddleware)
  .use(standardSecurityMiddleware)
  .use(readSecurityMiddleware)
  .route({
    method: "GET",
    path: "/channels/:channelId",
    summary: "Get a Channel by ID",
    tags: ["channels"],
  })
  .input(
    z.object({
      channelId: z.string(),
    }),
  )
  .output(
    z.object({
      channelName: z.string(),
      currentUser: z.custom<KindeUser<Record<string, unknown>>>(),
    }),
  )
  .handler(async ({ context, input, errors }) => {
    try {
      const channel = await prisma.channel.findUnique({
        where: {
          id: input.channelId,
          workspaceId: context.workspace.orgCode,
        },
        select: {
          name: true,
        },
      });

      if (!channel) {
        throw errors.NOT_FOUND();
      }

      return {
        channelName: channel.name,
        currentUser: context.user,
      };
    } catch (error) {
      const prismaError =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string; meta?: unknown; clientVersion?: string })
          : null;

      console.error("❌ Prisma channel.findMany failed", {
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
