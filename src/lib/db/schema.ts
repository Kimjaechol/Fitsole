import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  primaryKey,
  uuid,
  real,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  hashedPassword: text("hashed_password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: timestamp("expires_at", { mode: "date" }),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// --- Foot Scanning Tables ---

export const scanStatusEnum = pgEnum("scan_status", [
  "uploading",
  "processing",
  "completed",
  "failed",
]);

export const footSideEnum = pgEnum("foot_side", ["left", "right"]);

export const footScans = pgTable("foot_scans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  footSide: footSideEnum("foot_side").notNull(),
  status: scanStatusEnum("status").default("uploading").notNull(),
  videoUrl: text("video_url"),
  modelUrl: text("model_url"),
  qualityScore: real("quality_score"),
  qualityLabel: text("quality_label"),
  processingStage: text("processing_stage"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const footMeasurements = pgTable("foot_measurements", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => footScans.id, { onDelete: "cascade" }),
  footLength: real("foot_length").notNull(),
  ballWidth: real("ball_width").notNull(),
  instepHeight: real("instep_height").notNull(),
  archHeight: real("arch_height").notNull(),
  heelWidth: real("heel_width").notNull(),
  toeLength: real("toe_length").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gaitAnalysis = pgTable("gait_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => footScans.id, { onDelete: "cascade" }),
  gaitPattern: text("gait_pattern").notNull(),
  ankleAlignment: text("ankle_alignment").notNull(),
  archFlexibilityIndex: real("arch_flexibility_index").notNull(),
  walkingVideoUrl: text("walking_video_url"),
  landmarksData: jsonb("landmarks_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pressureDistribution = pgTable("pressure_distribution", {
  id: uuid("id").defaultRandom().primaryKey(),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => footScans.id, { onDelete: "cascade" }),
  heatmapData: jsonb("heatmap_data").notNull(),
  highPressureZones: jsonb("high_pressure_zones"),
  inputWeight: real("input_weight"),
  inputGender: text("input_gender"),
  inputAge: real("input_age"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
