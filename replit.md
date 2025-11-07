# VocalSurvey - منصة الاستبيانات الصوتية الاحترافية

## نظرة عامة
VocalSurvey هي منصة استبيانات عربية-عالمية متقدمة قائمة على تقنية Voice-First، حيث تُسمع الأسئلة وتُملى الإجابات صوتياً باستخدام Text-to-Speech و Speech-to-Text مع معالجة ذكية للأوامر الصوتية.

## البنية التقنية

### Frontend
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Fonts**: IBM Plex Sans Arabic (عربي) + Inter (إنجليزي)
- **Charts**: Recharts
- **Voice**: Web Speech API (STT) + ElevenLabs (TTS)

### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL + Drizzle ORM
- **WebSocket**: ws (للصوت الحي)
- **TTS Service**: ElevenLabs API

### الميزات الأساسية (MVP)

#### 1. واجهة Responder الصوتية (`/survey/:id`)
- تصميم بطاقات احترافي بتنسيق أخضر مطابق للتصميم المرفق
- تشغيل تلقائي للأسئلة بالصوت (TTS)
- التقاط الإجابات الصوتية (STT) مع دعم:
  - أسئلة Score 1-5 و 1-10
  - أسئلة نصية (Text)
  - أسئلة مختلطة (Both)
- أوامر صوتية ذكية: التالي، السابق، إرسال، إعادة
- مؤشرات حية: "يسجل الآن"، "لم أسمع جيداً"
- انتقال تلقائي بعد التقاط الأرقام
- دعم كامل للعربية (RTL) والإنجليزية (LTR)

#### 2. لوحة التحكم (`/dashboard`)
- عرض جميع الاستبيانات
- إنشاء استبيانات جديدة
- إدارة حالة الاستبيانات (نشط/غير نشط)
- روابط سريعة: تحرير، تحليلات، معاينة

#### 3. محرر الاستبيان (`/survey/:id/edit`)
- تحرير معلومات الاستبيان (العنوان، الوصف، اللغة)
- إضافة/حذف/ترتيب الأسئلة بالسحب
- أنواع أسئلة متعددة (Score 5, Score 10, Text, Both)
- تخصيص الألوان والشعار
- إعدادات متقدمة:
  - تفعيل/تعطيل الصوت
  - الانتقال التلقائي
  - السماح بإعادة السؤال
  - إظهار شريط التقدم
- نسخ رابط المشاركة

#### 4. لوحة التحليلات (`/survey/:id/analytics`)
- إحصائيات عامة: إجمالي الردود، متوسط الوقت، معدل الإكمال
- تحليل كل سؤال:
  - رسوم بيانية (Bar Charts) لتوزيع الدرجات
  - عرض الإجابات النصية
  - متوسط الدرجات
- تصدير البيانات

## نموذج البيانات (Database Schema)

### surveys
- id, title, description, logoUrl, primaryColor
- isActive, language (ar/en)
- settings (JSON): voiceEnabled, autoAdvance, allowReplay, showProgressBar
- createdAt

### questions
- id, surveyId, order, text
- type: score_5 | score_10 | text | both
- voiceUrl (رابط ملف TTS)
- required

### responses
- id, surveyId, completedAt, duration

### answers
- id, responseId, questionId
- scoreValue, textValue

## الخدمات الخارجية

### ElevenLabs (TTS)
- **API Key**: ELEVENLABS_API_KEY (في Secrets)
- **استخدام**: تحويل نص الأسئلة إلى صوت طبيعي
- **دعم**: العربية والإنجليزية

### Web Speech API (STT)
- **مدمج**: في المتصفح (Chrome, Safari, Edge)
- **استخدام**: تحويل الكلام إلى نص
- **دعم**: ar-SA (عربي), en-US (إنجليزي)

## الملفات الرئيسية

### Frontend
- `client/src/pages/responder.tsx` - واجهة الاستبيان الصوتية
- `client/src/pages/dashboard.tsx` - لوحة التحكم الرئيسية
- `client/src/pages/survey-editor.tsx` - محرر الاستبيان
- `client/src/pages/analytics.tsx` - لوحة التحليلات
- `client/src/hooks/useSpeechRecognition.ts` - Hook للتعرف على الكلام
- `client/src/hooks/useVoiceCommands.ts` - Hook للأوامر الصوتية

### Backend
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database Storage interface
- `server/db.ts` - Database connection
- `shared/schema.ts` - Drizzle schemas & types

### Design System
- `client/src/index.css` - CSS variables & utilities (لا تعدّل)
- `tailwind.config.ts` - Tailwind configuration
- `design_guidelines.md` - مرجع التصميم الكامل

## التشغيل
```bash
npm run dev  # يشغل Frontend (Vite) + Backend (Express)
npm run db:push  # مزامنة Database schema
```

## ملاحظات تقنية
- استخدام Web Speech API يتطلب HTTPS (أو localhost)
- الصوتيات تعمل فقط على المتصفحات الحديثة
- دعم RTL كامل للعربية في جميع الواجهات
- الألوان الخضراء (#22C55E) مطابقة للتصميم المرفق

## ملاحظات تقنية هامة

### Speech-to-Text (STT)
- **النهج المتبع في MVP**: Web Speech API المدمج في المتصفح (Chrome, Safari, Edge)
- **المزايا**: 
  - مجاني تماماً
  - دعم ممتاز للعربية (ar-SA) والإنجليزية (en-US)
  - لا يتطلب خادم STT منفصل
  - موثوقية عالية
- **البديل المستقبلي**: WebSocket + Speechmatics/Google Cloud Speech (للإنتاج الكبير)

### Text-to-Speech (TTS)
- **الخدمة**: ElevenLabs API
- **الصوت**: eleven_multilingual_v2 (يدعم العربية والإنجليزية)
- **التخزين**: Base64 data URIs في حقل voiceUrl (للـMVP)
- **التحسين المستقبلي**: تخزين ملفات MP3 في S3 + CDN

## الحالة الراهنة
✅ Task 1: Schema & Frontend Excellence - مكتمل
✅ Task 2: Backend Implementation - مكتمل
✅ Task 3: Integration & Testing - مكتمل

## التحسينات المطبقة
1. إصلاح مشكلة اللغة في TTS - الآن يحافظ على لغة الاستبيان عند تحديث الأسئلة
2. إزالة WebSocket غير المستخدم - تبسيط الكود والتركيز على Web Speech API
3. دعم كامل للعربية والإنجليزية في جميع المكونات

## المراحل التالية
- AI Cleanup لتصحيح أخطاء STT
- نظام Team Members مع صلاحيات
- تحليلات متقدمة (NPS, Heatmaps, Word Cloud)
- Conditional Logic للأسئلة
- Theme Builder متقدم
