# VocalSurvey - منصة الاستبيانات الصوتية الاحترافية

## Overview
VocalSurvey is an advanced Arabic-global voice-first survey platform that utilizes Text-to-Speech (TTS) and Speech-to-Text (STT) technologies. It allows users to listen to questions and dictate answers vocally, incorporating intelligent voice command processing. The platform aims to revolutionize survey methodologies by offering a highly interactive and accessible experience, particularly for Arabic speakers, with ambitions for global expansion.

## User Preferences
Not specified.

## System Architecture

### UI/UX Decisions
- Professional card-based design with a consistent green color scheme.
- Full support for both Arabic (RTL) and English (LTR) layouts across all interfaces.
- Uses IBM Plex Sans Arabic and Inter fonts for optimal readability.
- Interactive microphone tutorial for clear permission requests and user guidance.

### Technical Implementations
**Frontend:**
-   **Framework**: React + TypeScript + Vite
-   **Styling**: Tailwind CSS + Shadcn UI
-   **State Management**: TanStack Query (React Query)
-   **Routing**: Wouter
-   **Charts**: Recharts
-   **Voice**: Web Speech API (fallback STT)

**Backend:**
-   **Runtime**: Node.js + Express
-   **Database**: PostgreSQL + Drizzle ORM
-   **WebSocket**: `ws` for real-time audio
-   **TTS Service**: ElevenLabs API

### Feature Specifications
-   **Responder Interface (`/survey/:id`)**:
    -   Voice-driven question playback (TTS) and answer capture (STT).
    -   Supports various question types: Score (1-5, 1-10), Text, and Mixed.
    -   Intelligent voice commands (Next, Previous, Submit, Replay).
    -   Live indicators for recording status and recognition feedback.
    -   Automatic progression after numerical input.
    -   Interactive microphone tutorial to guide users and manage permissions.
-   **Dashboard (`/dashboard`)**:
    -   Overview of all surveys.
    -   Creation and management (active/inactive status) of new surveys.
    -   Quick links for editing, analytics, and preview.
-   **Survey Editor (`/survey/:id/edit`)**:
    -   Edit survey details (title, description, language).
    -   Drag-and-drop question management.
    -   Customization of colors, logo, and advanced settings (voice enable, auto-advance, replay, progress bar).
    -   Sharing link generation.
-   **Analytics Panel (`/survey/:id/analytics`)**:
    -   Table view of all responses, including participant IDs and answers.
    -   Smart display for "both" question types (`scoreValue – textValue`).
    -   Export functionality to Excel (`.xlsx`) format using SheetJS.

### System Design Choices
-   **Voice-First Approach**: Central to the platform's functionality, prioritizing speech interaction.
-   **Real-time STT**: Utilizes Speechmatics Real-Time API for high accuracy and low latency, especially for Arabic dialects.
-   **Efficient Audio Processing**: JWT token caching and audio pipeline reuse for faster STT initiation.
-   **Scalable Database Schema**: Designed for surveys, questions, responses, and answers.
-   **Modular Design**: Separation of frontend and backend concerns, with clear file structures and hooks for voice functionalities.

## External Dependencies

-   **ElevenLabs API**: Used for high-quality Text-to-Speech synthesis in both Arabic and English.
-   **Speechmatics Real-Time API**: Primary Speech-to-Text service for high accuracy and low latency, supporting various Arabic dialects.
-   **Web Speech API**: Browser-native Speech-to-Text as a fallback option.
-   **SheetJS (xlsx library)**: For exporting survey response data to Excel files.