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
  // Role-based access control per D-12/D-13. "user" | "admin"; set directly in DB.
  role: text("role").default("user").notNull(),
  // Phase 06 D-02: customer segment ('health' | 'general' | 'athlete').
  // Nullable because guests and not-yet-prompted users have none. Not a
  // pgEnum so legacy rows map cleanly to null and we can extend segments
  // without a schema migration round-trip.
  segment: text("segment"),
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

// --- Insole Design Tables ---

export const insoleDesigns = pgTable("insole_designs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scanId: uuid("scan_id")
    .notNull()
    .references(() => footScans.id, { onDelete: "cascade" }),
  footSide: footSideEnum("foot_side").notNull(),
  lineType: text("line_type").notNull(),
  designParams: jsonb("design_params").notNull(),
  hardnessMap: jsonb("hardness_map").notNull(),
  stlUrl: text("stl_url"),
  slicerProfileUrl: text("slicer_profile_url"),
  designParamsJson: text("design_params_json"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- SALTED Session Tables ---

export const saltedSessions = pgTable("salted_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scanId: uuid("scan_id").references(() => footScans.id, {
    onDelete: "set null",
  }),
  sessionType: text("session_type").notNull(),
  rawPressureData: jsonb("raw_pressure_data"),
  analysisResult: jsonb("analysis_result"),
  durationSeconds: real("duration_seconds"),
  dataPointCount: real("data_point_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Orders Tables ---

export const orderStatusEnum = pgEnum("order_status", [
  "pending",         // 주문 대기
  "paid",            // 결제 완료
  "designing",       // 인솔 설계중
  "manufacturing",   // 제작중
  "shipping",        // 배송중
  "delivered",       // 배송 완료
  "cancelled",       // 취소됨
]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull().unique(), // FS-YYYYMMDD-XXXX format
  status: orderStatusEnum("status").default("pending").notNull(),
  totalAmount: real("total_amount").notNull(),          // KRW
  shippingName: text("shipping_name").notNull(),
  shippingPhone: text("shipping_phone").notNull(),
  shippingZipcode: text("shipping_zipcode").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingDetailAddress: text("shipping_detail_address"),
  paymentKey: text("payment_key"),                      // Toss Payments paymentKey
  paymentMethod: text("payment_method"),                // card, kakaopay, naverpay, tosspay, transfer
  paidAt: timestamp("paid_at"),
  // Fulfillment tracking per D-03 ("tracking number when available")
  trackingNumber: text("tracking_number"),
  trackingCarrier: text("tracking_carrier"),            // e.g., "cj", "hanjin", "lotte"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Offline Store Reservations & Kit Inventory (D-11, ADMN-06) ---

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",    // 대기
  "confirmed",  // 확인됨
  "completed",  // 완료
  "cancelled",  // 취소됨
]);

export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  reservationDate: timestamp("reservation_date").notNull(),
  timeSlot: text("time_slot").notNull(),       // e.g., "10:00-11:00"
  serviceType: text("service_type").notNull(), // 'measurement' | 'consultation' | 'pickup'
  status: reservationStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitInventory = pgTable("kit_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  kitName: text("kit_name").notNull(),
  totalQuantity: real("total_quantity").notNull(),
  availableQuantity: real("available_quantity").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),              // Payload product ID (text, not FK)
  productName: text("product_name").notNull(),
  size: real("size").notNull(),                         // mm
  price: real("price").notNull(),                       // shoe price KRW
  bundleInsolePrice: real("bundle_insole_price"),       // insole add-on KRW
  includesInsole: text("includes_insole").default("false").notNull(), // boolean as text
  designId: uuid("design_id").references(() => insoleDesigns.id, { onDelete: "set null" }),
  designSource: text("design_source"),                  // 'general' | 'professional'
  quantity: real("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
