import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["super_admin", "host", "player"]);
export const gameStatusEnum = pgEnum("game_status", [
  "draft",
  "open",
  "active",
  "settled",
  "cancelled",
]);
export const participantStatusEnum = pgEnum("participant_status", [
  "host",
  "invited",
  "confirmed",
  "declined",
  "waitlist",
  "guest",
]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
  "declined",
]);
export const gameInviteStatusEnum = pgEnum("game_invite_status", [
  "pending",
  "registered",
  "confirmed",
  "declined",
  "expired",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "buy_in",
  "rebuy",
  "cash_out",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "platform_invite",
  "game_invite",
  "game_confirmed",
  "game_full",
  "game_started",
  "game_settled",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "user_registered",
  "user_disabled",
  "user_enabled",
  "role_granted",
  "game_created",
  "game_started",
  "game_settled",
  "game_cancelled",
  "transaction_recorded",
  "invite_sent",
  "settlement_marked",
  "settings_updated",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
  },
  (table) => [uniqueIndex("user_roles_user_role_idx").on(table.userId, table.role)],
);

export const platformInvites = pgTable("platform_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: inviteStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const platformInvitesRelations = relations(platformInvites, ({ one }) => ({
  invitedBy: one(users, {
    fields: [platformInvites.invitedByUserId],
    references: [users.id],
  }),
}));

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: gameStatusEnum("status").notNull().default("open"),
  currency: text("currency").notNull().default("USD"),
  defaultBuyIn: numeric("default_buy_in", { precision: 10, scale: 2 })
    .notNull()
    .default("50"),
  maxPlayers: integer("max_players").notNull().default(8),
  location: text("location"),
  joinCode: text("join_code").notNull().unique(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameParticipants = pgTable("game_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  status: participantStatusEnum("status").notNull().default("invited"),
  seatNumber: integer("seat_number"),
  settlementMarked: boolean("settlement_marked").notNull().default(false),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameInvites = pgTable("game_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  platformInviteId: uuid("platform_invite_id").references(() => platformInvites.id, {
    onDelete: "set null",
  }),
  token: text("token").notNull().unique(),
  status: gameInviteStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameInvitesRelations = relations(gameInvites, ({ one }) => ({
  game: one(games, { fields: [gameInvites.gameId], references: [games.id] }),
}));

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => gameParticipants.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  recordedByUserId: uuid("recorded_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settlementLines = pgTable("settlement_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  fromParticipantId: uuid("from_participant_id")
    .notNull()
    .references(() => gameParticipants.id, { onDelete: "cascade" }),
  toParticipantId: uuid("to_participant_id")
    .notNull()
    .references(() => gameParticipants.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  payerMarkedSettled: boolean("payer_marked_settled").notNull().default(false),
  payeeMarkedSettled: boolean("payee_marked_settled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settlementLinesRelations = relations(settlementLines, ({ one }) => ({
  fromParticipant: one(gameParticipants, {
    fields: [settlementLines.fromParticipantId],
    references: [gameParticipants.id],
    relationName: "settlement_from",
  }),
  toParticipant: one(gameParticipants, {
    fields: [settlementLines.toParticipantId],
    references: [gameParticipants.id],
    relationName: "settlement_to",
  }),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: auditActionEnum("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  hostedGames: many(games),
  participants: many(gameParticipants),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  host: one(users, { fields: [games.hostId], references: [users.id] }),
  participants: many(gameParticipants),
  invites: many(gameInvites),
  transactions: many(transactions),
  settlementLines: many(settlementLines),
}));

export const gameParticipantsRelations = relations(gameParticipants, ({ one, many }) => ({
  game: one(games, { fields: [gameParticipants.gameId], references: [games.id] }),
  user: one(users, { fields: [gameParticipants.userId], references: [users.id] }),
  outgoingSettlements: many(settlementLines, { relationName: "settlement_from" }),
  incomingSettlements: many(settlementLines, { relationName: "settlement_to" }),
}));

export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GameParticipant = typeof gameParticipants.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
