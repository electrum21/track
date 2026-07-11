# NTUTrack Telegram bot

Sends reminders for overdue and upcoming assignments, and lets you check your NTUTrack tasks, directly in Telegram.

Bot: [@ntutrackbot](https://t.me/ntutrackbot)

## How it works

This bot doesn't talk to the database directly. It's a thin client over the NTUTrack Spring Boot backend's internal API (`/internal/telegram/**`), authenticated with a shared secret rather than a user's Firebase session. Linking a Telegram chat to an NTUTrack account is a one-time code exchange:

1. You log into the NTUTrack site and generate a linking code from Settings.
2. You send that code to the bot (via a `t.me/ntutrackbot?start=<code>` deep link, or manually with `/link <code>`).
3. The bot forwards the code to the backend, which validates it and stores your Telegram chat ID against your account.

From then on, the bot identifies you by chat ID alone — no repeated login. A background job also polls the backend daily for tasks that are overdue or due soon, and pushes a reminder to every linked chat automatically.

## Commands

**Getting started**
| Command | Description |
|---|---|
| `/start` | Link this chat via a code, or check your current link status |
| `/link <code>` | Link manually using a code from NTUTrack's Settings panel |
| `/unlink` | Disconnect this chat from your account (asks for confirmation) |

**Tasks**
| Command | Description |
|---|---|
| `/tasks all` | Show all tasks |
| `/tasks overdue` | Show only overdue tasks |
| `/tasks today` | Show tasks due today |

**Account**
| Command | Description |
|---|---|
| `/profile` | View your linked account info |
| `/help` | Show this command list |

Reminders for overdue/due-soon tasks are also sent automatically once your account is linked — no command required.

## Setup

### Requirements
- Python 3.11+
- A running instance of the [NTUTrack backend](../) (Spring Boot), reachable from wherever this bot runs
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Install

```bash
cd telegram-bot
python -m venv venv
source venv/bin/activate   # venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Configure

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `TELEGRAM_API_TOKEN` | Bot token from BotFather. **Treat as a secret — never commit it.** |
| `TELEGRAM_BOT_HANDLE` | The bot's `@username`, used for detecting mentions in group chats |
| `TELEGRAM_BACKEND_URL` | Base URL of the NTUTrack backend, e.g. `http://localhost:8080` (no trailing `/api`) |
| `TELEGRAM_BACKEND_SECRET` | Shared secret sent as the `X-Bot-Secret` header on every backend call. Must match `telegram.bot.shared-secret` in the backend's `application.properties`. |

Generate a strong value for the shared secret once with:
```bash
openssl rand -hex 32
```

### Run

```bash
python main.py
```

On startup the bot registers its command list with Telegram and begins polling for messages. The reminder job runs once every 24 hours, starting shortly after boot.

## Project structure

```
telegram-bot/
├── main.py          # command handlers, callback handlers, reminder job, entrypoint
├── api_client.py     # thin HTTP client wrapping the backend's /internal/telegram/** routes
├── requirements.txt
├── .env.example
└── .env              # not committed — real secrets live here
```

`api_client.py` is the only place that talks to the backend. Handlers in `main.py` should call functions from it rather than making HTTP requests inline, so there's a single place to update if the backend's internal API changes shape.

## Notes for local development

- The bot process is stateless — it never caches chat-to-user mappings itself. Every command re-queries the backend by chat ID, so restarting the bot never loses linking state (that lives in Postgres, on the `User` row).
- Use a separate dev bot token (a second bot registered with BotFather) for local testing rather than polling with the production token, to avoid colliding with real traffic.
- If a command silently does nothing, check the terminal output first — most failures currently surface as an unhandled exception logged by the global error handler rather than a user-facing message. Worth wrapping remaining unguarded `api_client` calls in try/except as this grows.

## Known limitations / not yet built

- No mute/pause option for reminders short of fully unlinking (`remindersEnabled` toggle is planned but not implemented).
- The reminder job sends a fresh notification every run for any task still overdue/due-soon — it doesn't yet track "already reminded about this task" to avoid repeats.
- Timestamps returned by the backend must be UTC with an explicit offset (e.g. via `Instant` or an explicit `ZoneOffset` conversion) — if a new endpoint returns a bare `LocalDateTime`, any client-side date math on it will be wrong for users in a different timezone than the server.