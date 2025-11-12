# 🔐 تحسينات API و Middleware

## 📋 Middleware Improvements

### 1. Authentication Middleware (محسّن)

```typescript
// server/middleware/auth.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, sessions } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      sessionId?: string;
    }
  }
}

// Replit Auth Integration Check
async function getReplitUser(req: Request): Promise<any> {
  // إذا كان Replit Auth متوفر
  if (process.env.REPL_AUTH && req.headers['x-replit-user-id']) {
    return {
      id: req.headers['x-replit-user-id'],
      email: req.headers['x-replit-user-email'],
      role: req.headers['x-replit-user-role'] || 'user',
    };
  }
  return null;
}

// JWT Token Authentication (Fallback)
async function getJWTUser(req: Request): Promise<any> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // التحقق من وجود session
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, decoded.sessionId),
          eq(sessions.userId, decoded.userId),
          gt(sessions.expiresAt, new Date())
        )
      );

    if (!session) {
      return null;
    }

    // جلب معلومات المستخدم
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    return null;
  }
}

// Main Authentication Middleware
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // محاولة Replit Auth أولاً
    let user = await getReplitUser(req);
    
    // Fallback إلى JWT
    if (!user) {
      user = await getJWTUser(req);
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'يجب تسجيل الدخول للوصول إلى هذا المورد'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin Only Middleware
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // يجب استدعاء requireAuth أولاً
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'ليس لديك صلاحيات للوصول إلى هذا المورد'
    });
  }

  next();
};

// Subscription Check Middleware
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { subscriptions } = await import('@shared/schema');
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, req.user.id),
        eq(subscriptions.status, 'active')
      )
    );

  if (!subscription) {
    return res.status(403).json({ 
      error: 'No active subscription',
      message: 'يجب أن يكون لديك اشتراك نشط'
    });
  }

  // التحقق من expiration
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    return res.status(403).json({ 
      error: 'Subscription expired',
      message: 'انتهت صلاحية الاشتراك'
    });
  }

  req.subscription = subscription; // Extend Request type
  next();
};
```

### 2. Rate Limiting Middleware

```typescript
// server/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // 5 محاولات فقط
  message: 'تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة لاحقاً.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 دقيقة
  max: 100, // 100 request
  message: 'تم تجاوز عدد الطلبات المسموح بها.',
});
```

### 3. Error Handling Middleware

```typescript
// server/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'خطأ في البيانات المرسلة',
      details: err.errors,
    });
  }

  // App Error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code || 'Error',
      message: err.message,
    });
  }

  // Unknown Error
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'حدث خطأ غير متوقع',
  });
};
```

---

## 📋 API Routes Improvements

### 1. Authentication Routes

```typescript
// server/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, sessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { insertUserSchema } from '@shared/schema';
import { authRateLimit } from '../middleware/rateLimit';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Signup
router.post('/signup', authRateLimit, async (req, res, next) => {
  try {
    const validatedData = insertUserSchema.parse(req.body);
    
    // التحقق من وجود المستخدم
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email));

    if (existingUser) {
      throw new AppError(400, 'البريد الإلكتروني مستخدم بالفعل', 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = validatedData.password
      ? await bcrypt.hash(validatedData.password, 10)
      : null;

    // إنشاء مستخدم
    const [newUser] = await db
      .insert(users)
      .values({
        email: validatedData.email,
        name: validatedData.name,
        passwordHash,
        role: validatedData.role || 'user',
      })
      .returning();

    // إنشاء subscription افتراضي (starter)
    // ... (سيتم إضافته لاحقاً)

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'البريد الإلكتروني وكلمة المرور مطلوبان');
    }

    // جلب المستخدم
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // التحقق من كلمة المرور
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // إنشاء session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 أيام

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // إنشاء JWT token
    const token = jwt.sign(
      { userId: user.id, sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get Current User
router.get('/me', requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.user!.id));

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      await db
        .delete(sessions)
        .where(eq(sessions.id, decoded.sessionId));
    } catch (error) {
      // Token invalid, ignore
    }
  }

  res.json({ success: true });
});

export default router;
```

### 2. Surveys Routes (محسّنة)

```typescript
// في server/routes.ts
import { requireAuth } from './middleware/auth';
import { requireActiveSubscription } from './middleware/auth';
import { apiRateLimit } from './middleware/rateLimit';

// Get all surveys (filtered by user)
app.get("/api/surveys", requireAuth, apiRateLimit, async (req, res) => {
  try {
    // Admin يمكنه رؤية جميع الاستبيانات
    if (req.user?.role === 'admin') {
      const allSurveys = await storage.getAllSurveys();
      return res.json(allSurveys);
    }

    // User يرى استبياناته فقط
    const userSurveys = await db
      .select()
      .from(surveys)
      .where(eq(surveys.userId, req.user!.id))
      .orderBy(desc(surveys.createdAt));

    res.json(userSurveys);
  } catch (error) {
    next(error);
  }
});

// Create survey (مع التحقق من limits)
app.post("/api/surveys", requireAuth, requireActiveSubscription, async (req, res, next) => {
  try {
    // التحقق من عدد الأسئلة
    const subscription = req.subscription!;
    const existingSurveys = await db
      .select()
      .from(surveys)
      .where(eq(surveys.userId, req.user!.id));

    if (existingSurveys.length >= subscription.maxQuestions) {
      throw new AppError(403, 'تم الوصول إلى الحد الأقصى لعدد الاستبيانات', 'LIMIT_REACHED');
    }

    const validatedData = insertSurveySchema.parse({
      ...req.body,
      userId: req.user!.id,
      subscriptionId: subscription.id,
    });

    const survey = await storage.createSurvey(validatedData);
    res.json(survey);
  } catch (error) {
    next(error);
  }
});
```

### 3. Responses Routes (مع التحقق من limits)

```typescript
// Create response (مع التحقق من limits)
app.post("/api/responses", requireAuth, async (req, res, next) => {
  try {
    const { response: responseData, answers: answersData } = req.body;

    // جلب subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, req.user!.id),
          eq(subscriptions.status, 'active')
        )
      );

    if (!subscription) {
      throw new AppError(403, 'لا يوجد اشتراك نشط');
    }

    // التحقق من usedResponses
    if (subscription.usedResponses >= subscription.maxResponses) {
      throw new AppError(403, 'تم الوصول إلى الحد الأقصى لعدد الردود', 'RESPONSE_LIMIT_REACHED');
    }

    // استخدام transaction
    await db.transaction(async (tx) => {
      // إنشاء response
      const validatedResponse = insertResponseSchema.parse(responseData);
      const [newResponse] = await tx
        .insert(responses)
        .values(validatedResponse)
        .returning();

      // إنشاء answers
      const validatedAnswers = answersData.map((a: any) =>
        insertAnswerSchema.parse({ ...a, responseId: newResponse.id })
      );
      await tx.insert(answers).values(validatedAnswers);

      // زيادة usedResponses
      await tx
        .update(subscriptions)
        .set({ 
          usedResponses: subscription.usedResponses + 1,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
```

---

## 📋 Admin Routes

```typescript
// server/routes/admin.ts
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { db } from '../db';
import { users, subscriptions, surveys } from '@shared/schema';
import { eq, desc, count } from 'drizzle-orm';

const router = Router();

// جميع routes تحتاج admin
router.use(requireAuth, requireAdmin);

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(users);

    res.json({
      users: allUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user details
router.get('/users/:id', async (req, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id));

    if (!user) {
      throw new AppError(404, 'المستخدم غير موجود');
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id));

    const userSurveys = await db
      .select()
      .from(surveys)
      .where(eq(surveys.userId, user.id));

    res.json({
      user,
      subscription,
      surveysCount: userSurveys.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get stats
router.get('/stats', async (req, res, next) => {
  try {
    const [usersCount] = await db
      .select({ count: count() })
      .from(users);

    const [surveysCount] = await db
      .select({ count: count() })
      .from(surveys);

    const [activeSubscriptions] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    res.json({
      users: usersCount.count,
      surveys: surveysCount.count,
      activeSubscriptions: activeSubscriptions.count,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## 📋 ملاحظات مهمة

1. **استخدام Transactions:** عند تحديث `usedResponses`، يجب استخدام transaction لمنع race conditions
2. **Error Handling:** جميع routes يجب أن تستخدم `next(error)` للـ error handling
3. **Input Validation:** استخدام Zod schemas لجميع inputs
4. **Rate Limiting:** إضافة rate limiting على جميع endpoints الحساسة
5. **Pagination:** جميع admin endpoints تحتاج pagination
