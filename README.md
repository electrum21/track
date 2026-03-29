# Track

An AI-powered academic deadline tracker for NTU students. Upload your course syllabus or semester timetable and Track automatically extracts all assignments, quizzes, and exams — organised by module, ready to review. Ask the built-in agent to manage your deadlines in plain English.

---

## Features

- **AI document parsing** — upload a PDF, PPTX, or DOCX and Gemini extracts all assessed tasks automatically
- **AI agent** — chat with Track in plain English to query, create, update, or delete tasks; suggested changes are presented for confirmation before anything is saved
- **Semester & month calendar views** — see your full workload at a glance, with week labels aligned to the academic calendar
- **Review queue** — tasks with uncertain dates are flagged for manual confirmation before saving
- **Course management** — auto-creates course entries from uploads, with support for manual entry and editing
- **Task completion tracking** — mark tasks done, with auto-completion for past deadlines
- **Academic calendar setup** — upload your school calendar or enter semester dates manually to label weeks correctly
- **Customisable task display** — choose which fields (due date, time, weightage) appear on calendar task cards
- **Dark / light / system theme**
- **Per-user settings** — all preferences are persisted to the database

---

## AI Agent

The agent tab lets you manage your academic workload through natural language. It has full context of your tasks and courses and can answer questions or propose changes.

### Example queries

| Query | What happens |
|---|---|
| "What's due this week?" | Lists all tasks due in the next 7 days |
| "Summarise my workload" | Breaks down tasks by module and urgency |
| "What's my heaviest module?" | Ranks modules by total weightage |
| "Add a quiz for SC2000 worth 20% due 15 April" | Proposes a create_task action for confirmation |
| "Mark Assignment 3 as complete" | Proposes an update_task action for confirmation |
| "Delete all SC1008 quizzes" | Proposes delete_task actions for each, one per confirmation card |
| "Change the due date of my project to 30 April" | Proposes an update_task action for confirmation |

### How confirmation works

When the agent suggests changes, an amber pill appears below its message — "N suggested changes — click to review". Clicking it opens a modal showing each suggested action with an **Accept** / **Reject** toggle per item. Only accepted changes are applied when you click **Apply**. After applying, all pages (Dashboard, Calendar, Course) update instantly without a reload.

### What the agent can do

- `create_task` — create a new task with title, module, type, due date/time, weightage, and note
- `update_task` — update any field on an existing task including status, due date, weightage
- `delete_task` — remove a task permanently
- `create_course` — add a new course with module code, name, professor, exam date and venue

Read-only queries (questions about deadlines, summaries, workload analysis) never trigger the confirmation modal — the agent just responds conversationally.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Spring Boot 4, Java 21 |
| Database | PostgreSQL via Supabase |
| Auth | Firebase Authentication (Google OAuth) |
| AI | Google Gemini 2.5 Flash |
| File conversion | Apache POI, PDFBox |

---

## Getting Started

### Prerequisites

- Java 21
- Node.js 18+
- Maven
- A [Supabase](https://supabase.com) project (free tier)
- A [Firebase](https://firebase.google.com) project with Google Auth enabled
- A [Gemini API key](https://aistudio.google.com)

### Backend setup

1. Clone the repo
2. Copy `src/main/resources/application.properties.example` to `application.properties`
3. Fill in your Supabase, Firebase, and Gemini credentials
4. Place your `firebase-service-account.json` in `src/main/resources/`
5. Run the backend:

```bash
./mvnw spring-boot:run
```

### Frontend setup

1. Navigate to the `frontend` folder
2. Install dependencies:

```bash
npm install
```

3. Copy `src/firebase.example.js` to `src/firebase.js` and fill in your Firebase config
4. Create a `.env` file:

```
VITE_API_URL=http://localhost:8080/api
```

5. Start the dev server:

```bash
npm run dev
```

---

## Environment Variables

### Backend (`application.properties`)

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
gemini.api.key=${GEMINI_API_KEY}
```

### Frontend (`.env`)

```
VITE_API_URL=http://localhost:8080/api
```

---

## Project Structure

```
track/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── api/            # API call functions
│   │   ├── components/     # Navbar, TaskModal, SettingsPanel
│   │   ├── hooks/          # useTasks, useSettings, useTheme
│   │   └── pages/          # Dashboard, Calendar, Course, ReviewQueue, Agent
├── src/                    # Spring Boot backend
│   └── main/java/com/track/track/
│       ├── config/         # Firebase, Security, CORS
│       ├── controller/     # REST endpoints (Task, Course, Upload, Agent)
│       ├── model/          # JPA entities
│       ├── repository/     # Spring Data repositories
│       └── service/        # Business logic, Gemini integration, Agent
└── pom.xml
```

---

## Deployment

- **Frontend** — [Vercel](https://vercel.com) (static site)
- **Backend** — [Render](https://render.com) (web service) or any Java-compatible host
- Set environment variables in your host's dashboard
- Add your production domain to Firebase → Authentication → Authorized Domains
- Update CORS in `SecurityConfig.java` to include your frontend URL

---

## Security Notes

- All API endpoints require a valid Firebase JWT
- The backend verifies tokens using Firebase Admin SDK — the frontend UID is never trusted directly
- Ownership is verified server-side before any update or delete operation
- Row Level Security (RLS) is enabled on Supabase — only the service role (backend) can access data
- Sensitive files (`firebase-service-account.json`, `application.properties`, `firebase.js`) are gitignored

---

## Known Limitations

- AI extraction accuracy varies by document format — the review queue handles uncertain results
- Gemini free tier is limited to 15 requests/minute
- PPTX/DOCX files are converted to PDF before extraction, which may lose some formatting context
- Agent suggestions are executed client-side via the existing API — complex multi-step operations may require multiple prompts