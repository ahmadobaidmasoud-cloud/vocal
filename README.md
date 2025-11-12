# VocalSurvey 🎤

منصة استبيانات صوتية احترافية ثنائية اللغة (عربي/إنجليزي) مع واجهة محادثة WhatsApp-style وذكاء صوتي متقدم.

## ✨ الميزات الرئيسية

### 🎯 واجهة Responder الصوتية
- ✅ **Voice-First Experience**: تشغيل تلقائي للأسئلة (TTS) + التقاط الإجابات الصوتية (STT)
- ✅ **WhatsApp-Style UI**: بطاقات محادثة خضراء (#D4F4DD) مع أزرار كبسولية
- ✅ **أوامر صوتية ذكية**: التالي، السابق، إرسال، إعادة
- ✅ **Tutorial الميكروفون**: حل مشكلة صلاحيات الجوال
- ✅ **دعم كامل RTL/LTR**: للعربية والإنجليزية
- ✅ **منع التكرار**: حماية من الإرسال المكرر بسبب race conditions

### 📊 لوحة التحليلات
- ✅ **جدول الردود المُبسّط**: ID + إجابات الأسئلة فقط (بدون تاريخ)
- ✅ **تصدير Excel**: ملفات .xlsx بأسماء محلية
- ✅ **معالجة ذكية**: لأسئلة "both" (score + text)

### 🎨 محرر الاستبيان
- ✅ **Drag & Drop**: لترتيب الأسئلة
- ✅ **أنواع متعددة**: Score 5, Score 10, Text, Both
- ✅ **إعدادات متقدمة**: صوت، انتقال تلقائي، progress bar
- ✅ **توليد TTS**: للأسئلة والمقدمة

## 🚀 التقنيات المستخدمة

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **Shadcn UI**
- **TanStack Query** (React Query)
- **Wouter** (routing)
- **IBM Plex Sans Arabic** + **Inter**

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Drizzle ORM**
- **WebSocket** (ws)

### الخدمات الخارجية
- **ElevenLabs API**: Text-to-Speech (TTS)
- **Speechmatics Real-Time API**: Speech-to-Text (STT)
  - دقة 18% أعلى للعربية
  - Latency <500ms للـpartials، <1s للـfinals
  - دعم الهجات (خليجي، مصري، شامي)

## 📦 التثبيت والتشغيل

### 1. استنساخ المشروع
```bash
git clone https://github.com/ahmadobaidmasoud-cloud/vocal.git
cd vocal
```

### 2. تثبيت المكتبات
```bash
npm install
```

### 3. إعداد البيئة
انسخ ملف `.env.example` إلى `.env` وأضف المفاتيح:
```bash
cp .env.example .env
```

أضف المفاتيح المطلوبة في `.env`:
- `DATABASE_URL`: رابط PostgreSQL
- `ELEVENLABS_API_KEY`: مفتاح ElevenLabs
- `SPEECHMATICS_API_KEY`: مفتاح Speechmatics
- `SESSION_SECRET`: سر الجلسات

### 4. إعداد قاعدة البيانات
```bash
npm run db:push
```

### 5. تشغيل التطبيق
```bash
npm run dev
```

التطبيق سيعمل على: `http://localhost:5000`

## 📂 هيكل المشروع

```
vocal/
├── client/src/
│   ├── pages/           # الصفحات الرئيسية
│   │   ├── responder.tsx      # واجهة الاستبيان الصوتية
│   │   ├── dashboard.tsx      # لوحة التحكم
│   │   ├── survey-editor.tsx  # محرر الاستبيان
│   │   └── analytics.tsx      # التحليلات
│   ├── hooks/           # React Hooks
│   │   ├── useSpeechRecognition.ts  # STT
│   │   └── useVoiceCommands.ts      # أوامر صوتية
│   ├── services/        # خدمات خارجية
│   │   └── speechmatics.ts          # Speechmatics client
│   └── components/      # مكونات UI
├── server/
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database logic
│   ├── db.ts           # Database connection
│   └── services/       # خدمات Backend
│       ├── elevenlabs-tts.ts
│       └── speechmatics-jwt.ts
├── shared/
│   └── schema.ts       # Drizzle schemas + types
└── design_guidelines.md # مرجع التصميم

```

## 🎯 الصفحات الرئيسية

| الصفحة | المسار | الوصف |
|--------|--------|-------|
| Dashboard | `/dashboard` | عرض جميع الاستبيانات |
| محرر الاستبيان | `/survey/:id/edit` | تحرير الاستبيان وأسئلته |
| واجهة الاستبيان | `/survey/:id` | الواجهة الصوتية للمشاركين |
| التحليلات | `/survey/:id/analytics` | جدول الردود + تصدير Excel |

## 🔐 متطلبات الـAPI Keys

### ElevenLabs (TTS)
1. سجل في [ElevenLabs](https://elevenlabs.io/)
2. احصل على API Key من Dashboard
3. أضفها في `.env`: `ELEVENLABS_API_KEY=sk_...`

### Speechmatics (STT)
1. سجل في [Speechmatics](https://www.speechmatics.com/)
2. احصل على API Key من Portal
3. أضفها في `.env`: `SPEECHMATICS_API_KEY=...`

### PostgreSQL
استخدم أي من الخيارات:
- [Neon](https://neon.tech/) (مجاني + سريع)
- [Supabase](https://supabase.com/)
- PostgreSQL محلي

## 📝 ملاحظات تقنية

### Recording Architecture
- **Pattern**: Stop/Restart per question
- **Rationale**: دقة أعلى من Continuous Recording
- **Latency**: ~150-300ms (مقبول)

### Duplicate Prevention
- **hasSubmittedRef**: حماية من race conditions
- **Retry Support**: السماح بإعادة المحاولة عند الفشل

### Skip Intro (v2.5)
- الاستبيان يبدأ مباشرة بالسؤال الأول
- لا توجد صفحة ترحيب

## 📊 الإصدارات

- **v2.5**: Skip Intro + Remove Date Column
- **v2.4**: Duplicate Submission Prevention
- **v2.3**: Microphone Permission Tutorial
- **v2.2**: Intro TTS + Auto-Complete
- **v2.1**: Analytics Simplified + Excel Export
- **v2.0**: Speechmatics Official SDK
- **v1.0**: MVP الأساسي

## 🤝 المساهمة

المشروع مفتوح للتطوير. للمساهمة:
1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit تغييراتك (`git commit -m 'Add amazing feature'`)
4. Push للـbranch (`git push origin feature/amazing-feature`)
5. افتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License.

## 📧 التواصل

للأسئلة والدعم: [GitHub Issues](https://github.com/ahmadobaidmasoud-cloud/vocal/issues)

---

صُنع بـ ❤️ في السعودية 🇸🇦
