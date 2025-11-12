# 🔧 تحسينات Database Schema المقترحة

## 📋 التغييرات المطلوبة على `shared/schema.ts`

### 1. جدول Users (جديد)
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  name: varchar("name"),
  passwordHash: varchar("password_hash"), // bcrypt hash (nullable if using Replit Auth)
  role: varchar("role").notNull().default("user"), // "user" | "admin"
  emailVerified: boolean("email_verified").default(false).notNull(), // للتحقق من البريد
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 2. جدول Sessions (محسّن)
```typescript
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address"), // للأمان
  userAgent: text("user_agent"), // للأمان
});
```

### 3. جدول Subscriptions (محسّن)
```typescript
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // كل مستخدم له subscription واحد فقط
  planType: varchar("plan_type").notNull(), // "starter" | "pro" | "customize"
  maxQuestions: integer("max_questions").notNull(), // 5, 10, custom
  maxResponses: integer("max_responses").notNull(), // 25, 50, custom
  usedResponses: integer("used_responses").notNull().default(0), // ✅ تصحيح: notNull
  status: varchar("status").default("active").notNull(), // "active" | "expired" | "cancelled"
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // ✅ إضافة
});
```

### 4. تعديل جدول Surveys
```typescript
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  introText: text("intro_text"),
  introVoiceUrl: text("intro_voice_url"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#22C55E"),
  isActive: boolean("is_active").default(true).notNull(),
  language: varchar("language", { length: 5 }).default("ar").notNull(),
  settings: jsonb("settings").$type<{
    voiceEnabled: boolean;
    autoAdvance: boolean;
    allowReplay: boolean;
    showProgressBar: boolean;
  }>().default({
    voiceEnabled: true,
    autoAdvance: true,
    allowReplay: true,
    showProgressBar: true,
  }).notNull(),
  userId: varchar("user_id") // ✅ إضافة
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(), // ✅ يجب أن يكون notNull
  subscriptionId: varchar("subscription_id") // ✅ إضافة
    .references(() => subscriptions.id, { onDelete: "set null" }), // set null وليس cascade
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 5. Relations (جديد)
```typescript
// Users Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  surveys: many(surveys),
  subscriptions: one(subscriptions),
  sessions: many(sessions),
}));

// Sessions Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Subscriptions Relations
export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  surveys: many(surveys),
}));

// Surveys Relations (تحديث)
export const surveysRelations = relations(surveys, ({ many, one }) => ({
  questions: many(questions),
  responses: many(responses),
  user: one(users, {
    fields: [surveys.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [surveys.subscriptionId],
    references: [subscriptions.id],
  }),
}));
```

### 6. Insert Schemas (جديد)
```typescript
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email(),
  password: z.string().min(8).optional(), // للتحقق قبل hash
  role: z.enum(["user", "admin"]).optional(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usedResponses: true, // لا يُدخل يدوياً
}).extend({
  planType: z.enum(["starter", "pro", "customize"]),
  status: z.enum(["active", "expired", "cancelled"]).optional(),
});
```

### 7. Types (جديد)
```typescript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Extended types
export type UserWithSubscription = User & {
  subscription?: Subscription;
};

export type SurveyWithUser = Survey & {
  user: User;
  subscription?: Subscription;
};
```

---

## 🔄 Migration Strategy

### للبيانات الموجودة (Surveys بدون userId):

```typescript
// migrations/001_add_user_system.sql
-- 1. إنشاء جدول users
-- 2. إنشاء جدول sessions
-- 3. إنشاء جدول subscriptions
-- 4. إضافة userId و subscriptionId إلى surveys
-- 5. إنشاء مستخدم admin افتراضي
-- 6. تعيين جميع الاستبيانات الموجودة للمستخدم admin

-- مثال:
INSERT INTO users (id, email, name, role) 
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin', 'admin');

UPDATE surveys 
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id IS NULL;
```

---

## ⚠️ ملاحظات مهمة

1. **userId في Surveys:** يجب أن يكون `notNull()` لأن كل استبيان يجب أن يكون له مالك
2. **subscriptionId في Surveys:** يمكن أن يكون `nullable` لأن الـ subscription قد يُحذف
3. **usedResponses:** يجب أن يكون `notNull().default(0)` لمنع null values
4. **onDelete cascade:** استخدام cascade على userId في surveys، و set null على subscriptionId
5. **unique constraint:** userId في subscriptions يجب أن يكون unique (مستخدم واحد = subscription واحد)
