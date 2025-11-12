# 🔧 التصحيحات السريعة المطلوبة

## ⚠️ Critical Fixes (يجب إصلاحها قبل البدء)

### 1. إضافة bcryptjs
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### 2. تصحيح Drizzle Syntax للـIndexes

**❌ خطأ**:
```typescript
(table) => ({
  userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
})
```

**✅ صحيح**:
```typescript
import { index } from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
  // ... columns
}, (table) => ({
  userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
}));
```

### 3. Partial Unique Index - Migration Script

**لا يمكن إنشاؤه في schema.ts** - يجب إنشاؤه في migration:

```sql
-- migrations/001_partial_unique_index.sql
CREATE UNIQUE INDEX subscriptions_active_user_idx 
ON subscriptions(user_id) 
WHERE status = 'active';
```

### 4. Sessions Table - لا تحتاج تعريفه

**❌ خطأ**: تعريف sessions في schema.ts

**✅ صحيح**: دع connect-pg-simple ينشئه تلقائياً

### 5. Atomic Increment - الصيغة الصحيحة

**❌ خطأ**:
```typescript
.set({ usedResponses: sql`used_responses + 1` })
```

**✅ صحيح**:
```typescript
await db.execute(sql`
  UPDATE subscriptions 
  SET used_responses = used_responses + 1 
  WHERE id = ${subscriptionId}
`);
```

---

## 📝 ملاحظات Syntax

### uuid() vs varchar()

- **الجداول الجديدة** (users, subscriptions): استخدم `uuid()`
- **الجداول الموجودة** (surveys): استمر مع `varchar()` لتجنب migration معقد

### CSRF Protection

- **للـMVP**: SameSite cookies كافٍ
- **للمستقبل**: أضف csurf package

### Rate Limiting

- **للـMVP**: memory store كافٍ
- **للمستقبل**: أضف Redis store

---

## ✅ الخطة جيدة - فقط هذه التصحيحات!
