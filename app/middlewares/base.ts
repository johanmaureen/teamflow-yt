import { os } from "@orpc/server";

export const base = os.$context<{ request: Request }>().errors({
  RATE_LIITED: {
    message: "You are rate limited.",
  },
  BAD_REQUEST: {
    message: "Bad request.",
  },
  NOT_FOUND: {
    message: "Not found.",
  },
  FORBIDDEN: {
    message: "This is forbidden",
  },
  UNAUTHORIZED: {
    message: "You are Unauthorized",
  },
  INTERNAL_SERVER_ERROR: {
    message: "Internal server error",
  },
});
