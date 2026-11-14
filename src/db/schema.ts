import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Citation } from "@/types";

/**
 * Document lifecycle. The column is plain text with a check constraint (not a
 * Postgres enum) so the set of statuses can evolve without enum gymnastics:
 * uploading -> processing -> ready | failed
 */
export const DocumentStatus = {
  Uploading: "uploading",
  Processing: "processing",
  Ready: "ready",
  Failed: "failed",
} as const;

export type DocumentStatusValue = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const messageRole = pgEnum("message_role", ["user", "assistant"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} IN ('admin', 'user')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const PlanTier = {
  Free: "free",
  Starter: "starter",
  Pro: "pro",
  Enterprise: "enterprise",
} as const;

export type PlanTierValue = (typeof PlanTier)[keyof typeof PlanTier];

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    planTier: text("plan_tier").notNull().default(PlanTier.Free),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "organizations_plan_tier_check",
      sql`${table.planTier} IN ('free', 'starter', 'pro', 'enterprise')`,
    ),
  ],
);

export const OrgMemberRole = {
  Owner: "owner",
  Admin: "admin",
  Member: "member",
  Viewer: "viewer",
} as const;

export type OrgMemberRoleValue = (typeof OrgMemberRole)[keyof typeof OrgMemberRole];

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default(OrgMemberRole.Member),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "org_members_role_check",
      sql`${table.role} IN ('owner', 'admin', 'member', 'viewer')`,
    ),
    index("org_members_org_id_idx").on(table.organizationId),
    index("org_members_user_id_idx").on(table.userId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    // Corpus collection (constitutional | statutes | case-law). Nullable so
    // documents uploaded before collections existed stay uncategorized.
    collection: text("collection"),
    status: text("status").notNull().default(DocumentStatus.Uploading),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "documents_status_check",
      sql`${table.status} IN ('uploading', 'processing', 'ready', 'failed')`,
    ),
    check(
      "documents_collection_check",
      sql`(${table.collection} IS NULL OR ${table.collection} IN ('constitutional', 'statutes', 'case-law'))`,
    ),
    index("documents_org_id_idx").on(table.organizationId),
    index("documents_user_id_idx").on(table.userId),
  ],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    pageNumber: integer("page_number"),
    chunkIndex: integer("chunk_index").notNull(),
    charCount: integer("char_count").notNull(),
    charStart: integer("char_start"),
    charEnd: integer("char_end"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chunks_document_id_idx").on(table.documentId),
    index("chunks_document_chunk_idx").on(
      table.documentId,
      table.chunkIndex,
    ),
  ],
);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    // Nullable only to preserve chats created before auth existed; the app
    // always sets an owner for new chats and filters reads by owner.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chats_org_id_idx").on(table.organizationId),
    index("chats_user_id_idx").on(table.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations")
      .$type<Citation[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId)],
);

export const settings = pgTable(
  "settings",
  {
    userId: text("user_id").notNull().default(""),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.key] }),
    index("settings_user_idx").on(table.userId),
  ],
);


export const ragEvals = pgTable(
  "rag_evals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    query: text("query").notNull(),
    expectedAnswer: text("expected_answer").notNull(),
    category: text("category").notNull().default("general"),
    expectedDocTitle: text("expected_doc_title"),
    lastScore: integer("last_score"), // 0 - 100
    lastPassed: integer("last_passed"), // 0 or 1
    lastLatencyMs: integer("last_latency_ms"),
    lastResult: text("last_result"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rag_evals_category_idx").on(table.category)],
);

export const planConfigs = pgTable(
  "plan_configs",
  {
    tier: text("tier").primaryKey(), // 'free', 'starter', 'pro', 'enterprise'
    name: text("name").notNull(),
    monthlyPriceUsd: integer("monthly_price_usd").notNull().default(0),
    monthlyTokens: integer("monthly_tokens").notNull().default(500000),
    maxDocuments: integer("max_documents").notNull().default(50),
    maxSeats: integer("max_seats").notNull().default(1),
    topKLimit: integer("top_k_limit").notNull().default(5),
    allowedModels: text("allowed_models").notNull().default("standard"),
    features: text("features").notNull().default("[]"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
