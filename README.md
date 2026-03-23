# Track

An AI-powered academic deadline tracker for NTU students. Upload your course syllabus or semester timetable and Track automatically extracts all assignments, quizzes, and exams — organised by module, ready to review.

---

## Features

- **AI document parsing** — upload a PDF, PPTX, or DOCX and Gemini extracts all assessed tasks automatically
- **Semester & month calendar views** — see your full workload at a glance, with week labels aligned to the academic calendar
- **Review queue** — tasks with uncertain dates are flagged for manual confirmation before saving
- **Course management** — auto-creates course entries from uploads, with support for manual entry and editing
- **Task completion tracking** — mark tasks done, with auto-completion for past deadlines
- **Academic calendar setup** — upload your school calendar or enter semester dates manually to label weeks correctly
- **Customisable task display** — choose which fields (due date, time, weightage) appear on calendar task cards
- **Dark / light / system theme**
- **Per-user settings** — all preferences are persisted to the database

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Spring Boot 3, Java 21 |
| Database | PostgreSQL via Supabase |
| Auth | Firebase Authentication |
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

3. Create a `.env` file:

```
VITE_API_URL=http://localhost:8080/api
```

4. Start the dev server:

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
│   │   ├── hooks/          # useSettings, useTheme
│   │   └── pages/          # Dashboard, Calendar, Course, ReviewQueue
├── src/                    # Spring Boot backend
│   └── main/java/com/track/track/
│       ├── config/         # Firebase, Security, CORS
│       ├── controller/     # REST endpoints
│       ├── model/          # JPA entities
│       ├── repository/     # Spring Data repositories
│       └── service/        # Business logic, Gemini integration
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
- Ownership is verified before any update or delete operation
- Row Level Security (RLS) is enabled on Supabase with no policies — only the service role (backend) can access data
- Preferences payload is limited to 10KB

---

## Known Limitations

- AI extraction accuracy varies by document format — the review queue handles uncertain results
- Gemini free tier is limited to 15 requests/minute
- PPTX/DOCX files are converted to PDF before extraction, which may lose some formatting context

---