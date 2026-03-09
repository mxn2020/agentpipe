/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiLogs from "../aiLogs.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as credits from "../credits.js";
import type * as devLogs from "../devLogs.js";
import type * as http from "../http.js";
import type * as modelCosts from "../modelCosts.js";
import type * as modelTests from "../modelTests.js";
import type * as nvidia from "../nvidia.js";
import type * as prompts from "../prompts.js";
import type * as rateLimit from "../rateLimit.js";
import type * as stripe from "../stripe.js";
import type * as stripeAdmin from "../stripeAdmin.js";
import type * as usageLimits from "../usageLimits.js";
import type * as users from "../users.js";
import type * as workflowRunner from "../workflowRunner.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiLogs: typeof aiLogs;
  auditLog: typeof auditLog;
  auth: typeof auth;
  credits: typeof credits;
  devLogs: typeof devLogs;
  http: typeof http;
  modelCosts: typeof modelCosts;
  modelTests: typeof modelTests;
  nvidia: typeof nvidia;
  prompts: typeof prompts;
  rateLimit: typeof rateLimit;
  stripe: typeof stripe;
  stripeAdmin: typeof stripeAdmin;
  usageLimits: typeof usageLimits;
  users: typeof users;
  workflowRunner: typeof workflowRunner;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
