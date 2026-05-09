import arcjet, { sensitiveInfo, slidingWindow } from "@/lib/arcjet";
import { base } from "../base";
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs";

const buildStandardAj = () =>
  arcjet.withRule(
    slidingWindow({
      mode: "LIVE",
      interval: "1m",
      max: 2,
    }),
  );
/*
    .withRule(
      sensitiveInfo({
        mode: "LIVE",
        deny: ["PHONE_NUMBER", "CREDIT_CARD_NUMBER"],
      }),
    );
    */

export const heavyWriteSecurityMiddleware = base
  .$context<{
    request: Request;
    user: KindeUser<Record<string, unknown>>;
  }>()
  .middleware(async ({ context, next, errors }) => {
    const decision = await buildStandardAj().protect(context.request, {
      userId: context.user.id,
    });

    if (decision.isDenied()) {
      if (decision.reason.isSensitiveInfo()) {
        throw errors.BAD_REQUEST({
          message:
            "Sensitive information detected, please remove PII (e.g. credit card data, phone numbers)",
        });
      }
      if (decision.reason.isRateLimit()) {
        throw errors.RATE_LIITED({
          message: "Too many impactual changes. Please slow down",
        });
      }

      throw errors.FORBIDDEN({
        message: "Request blocked!",
      });
    }
    return next();
  });
