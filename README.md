# NTUTrack

An AI-powered academic deadline tracker for NTU students. Upload your course syllabus or semester timetable and NTUTrack automatically extracts all assignments, quizzes, and exams - organised by module, ready to review. Ask the built-in agent to manage your deadlines in plain English, or link your account to the Telegram bot to get reminders where you already check messages.

---

## Features

- **AI document parsing** - upload a PDF, PPTX, or DOCX and Gemini extracts all assessed tasks automatically
- **AI agent** - chat with NTUTrack in plain English to query, create, update, or delete tasks; suggested changes are presented for confirmation before anything is saved
- **Semester & month calendar views** - see your full workload at a glance, with week labels aligned to the academic calendar
- **Review queue** - tasks with uncertain dates are flagged for manual confirmation before saving
- **Course management** - auto-creates course entries from uploads, with support for manual entry and editing
- **Task completion tracking** - mark tasks done, with auto-completion for past deadlines
- **Academic calendar setup** - upload your school calendar or enter semester dates manually to label weeks correctly
- **Customisable task display** - choose which fields (due date, time, weightage) appear on calendar task cards
- **Telegram reminders** - link your account to [@ntutrackbot](https://t.me/ntutrackbot) for automatic reminders on overdue and upcoming tasks, plus on-demand task lookups from chat
- **Dark / light / system theme**
- **Per-user settings** - all preferences are persisted to the database

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

When the agent suggests changes, an amber pill appears below its message - "N suggested changes - click to review". Clicking it opens a modal showing each suggested action with an **Accept** / **Reject** toggle per item. Only accepted changes are applied when you click **Apply**. After applying, all pages (Dashboard, Calendar, Course) update instantly without a reload.

### What the agent can do

- `create_task` - create a new task with title, module, type, due date/time, weightage, and note
- `update_task` - update any field on an existing task including status, due date, weightage
- `delete_task` - remove a task permanently
- `create_course` - add a new course with module code, name, professor, exam date and venue

Read-only queries (questions about deadlines, summaries, workload analysis) never trigger the confirmation modal - the agent just responds conversationally.

---

## Telegram bot integration

NTUTrack ships with a companion Telegram bot ([@ntutrackbot](https://t.me/ntutrackbot)) for reminders and on-the-go task lookups, without needing to open the web app.

### Linking an account

The bot doesn't have its own login - it links to an existing NTUTrack account via a short-lived, single-use code, generated from **Settings → Link Telegram** on the website. Tapping the generated deep link (or typing `/link <code>` in the bot) associates that Telegram chat with your account server-side. Codes expire after 10 minutes and can't be reused.

### Commands

| Command | Description |
|---|---|
| `/start` | Consume a linking code from a deep link, or check current link status |
| `/link <code>` | Link manually using a code from Settings |
| `/unlink` | Disconnect this chat from your account (asks for confirmation) |
| `/tasks all` \| `overdue` \| `today` | Look up tasks by filter |
| `/profile` | View your linked account info |
| `/help` | List all commands |

Once linked, the bot also sends automatic reminders for overdue and soon-due tasks on a recurring schedule - no command needed.

### How it fits together

The bot is a thin client - it holds no business logic and never touches the database directly. It talks to the backend over a small set of internal endpoints (`/internal/telegram/**`), authenticated with a shared secret (`X-Bot-Secret` header) rather than a user's Firebase session, since the bot process isn't a logged-in user. All task-filtering logic (what counts as "overdue" or "due today") lives once, in the backend's `TaskService`, so the bot, the website, and any future client all see the same definitions.

See [`telegram-bot/README.md`](./telegram-bot/README.md) for bot-specific setup and architecture details.

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
| Telegram bot | Python, python-telegram-bot |

---

## Getting Started

### Prerequisites

- Java 21
- Node.js 18+
- Python 3.11+ (only needed for the Telegram bot)
- Maven
- A [Supabase](https://supabase.com) project (free tier)
- A [Firebase](https://firebase.google.com) project with Google Auth enabled
- A [Gemini API key](https://aistudio.google.com)
- A Telegram bot token from [@BotFather](https://t.me/BotFather) (only needed for the Telegram bot)

### Backend setup

1. Clone the repo
2. Copy `src/main/resources/application.properties.example` to `application.properties`
3. Fill in your Supabase, Firebase, and Gemini credentials, plus a generated `telegram.bot.shared-secret` (see below)
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

### Telegram bot setup

See [`telegram-bot/README.md`](./telegram-bot/README.md) for full instructions. In short:

```bash
cd telegram-bot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in TELEGRAM_API_TOKEN, TELEGRAM_BACKEND_URL, TELEGRAM_BACKEND_SECRET
python main.py
```

`TELEGRAM_BACKEND_SECRET` in the bot's `.env` must match `telegram.bot.shared-secret` in the backend's `application.properties` exactly - generate one shared value with `openssl rand -hex 32` and use it in both places.

---

## Environment Variables

### Backend (`application.properties`)

```properties
spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
gemini.api.key=${GEMINI_API_KEY}
telegram.bot.shared-secret=${TELEGRAM_BOT_SHARED_SECRET}
```

### Frontend (`.env`)

```
VITE_API_URL=http://localhost:8080/api
```

### Telegram bot (`.env`)

```
TELEGRAM_API_TOKEN=your_api_token
TELEGRAM_BOT_HANDLE=your_bot_handle
TELEGRAM_BACKEND_URL=your_backend_url
TELEGRAM_BACKEND_SECRET=your_backend_secret
```

---

## Project Structure

```
ntutrack/
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── api/              # API call functions
│   │   ├── components/       # Navbar, TaskModal, SettingsPanel
│   │   ├── hooks/             # useTasks, useSettings, useTheme
│   │   └── pages/             # Dashboard, Calendar, Course, ReviewQueue, Agent, Login
├── telegram-bot/             # Python Telegram bot (reminders, on-demand task lookup)
│   ├── main.py                # command handlers, callback handlers, reminder job
│   ├── api_client.py           # HTTP client wrapping the backend's /internal/telegram/** routes
│   └── requirements.txt
├── src/                     # Spring Boot backend
│   └── main/java/com/track/track/
│       ├── config/            # Firebase, Security, CORS
│       ├── controller/        # REST endpoints (Task, Course, Upload, Agent, Telegram)
│       ├── model/             # JPA entities
│       ├── repository/        # Spring Data repositories
│       └── service/           # Business logic, Gemini integration, Agent, Telegram linking
└── pom.xml
```

---

## Deployment

- **Frontend** - [Vercel](https://vercel.com) (static site)
- **Backend** - [Render](https://render.com) (web service) or any Java-compatible host
- **Telegram bot** - a separate long-running process (e.g. a Render worker or small VM) - it polls Telegram continuously and isn't served over HTTP, so it can't be deployed the same way as the frontend/backend
- Set environment variables in each host's dashboard
- Add your production domain to Firebase → Authentication → Authorized Domains
- Update CORS in `SecurityConfig.java` to include your frontend URL
- Ensure `/internal/telegram/**` on the deployed backend is reachable from wherever the bot process runs

---

## Security Notes

- All `/api/**` endpoints require a valid Firebase JWT
- The backend verifies tokens using Firebase Admin SDK - the frontend UID is never trusted directly
- Ownership is verified server-side before any update or delete operation
- Row Level Security (RLS) is enabled on Supabase - only the service role (backend) can access data
- `/internal/telegram/**` endpoints are not user-authenticated (the bot has no Firebase session) - they're instead protected by a shared secret sent as the `X-Bot-Secret` header, checked server-side on every request
- Telegram account-linking codes are single-use, expire after 10 minutes, and are validated server-side before a chat ID is attached to an account
- Sensitive files (`firebase-service-account.json`, `application.properties`, `firebase.js`, the bot's `.env`) are gitignored

---

## Known Limitations

- AI extraction accuracy varies by document format - the review queue handles uncertain results
- Gemini free tier is limited to 15 requests/minute
- PPTX/DOCX files are converted to PDF before extraction, which may lose some formatting context
- Agent suggestions are executed client-side via the existing API - complex multi-step operations may require multiple prompts
- The Telegram bot has no per-chat mute option yet - the only way to stop reminders is to fully unlink
- The reminder job doesn't track which tasks it already notified about, so an unresolved task is re-sent every run rather than once