import os
import httpx
from dotenv import load_dotenv
load_dotenv()

# Load environment variables
BACKEND_URL = os.getenv("TELEGRAM_BACKEND_URL")
BACKEND_SECRET = os.getenv("TELEGRAM_BACKEND_SECRET")

if not BACKEND_URL:
    raise RuntimeError("TELEGRAM_BACKEND_URL is not set")
if not BACKEND_SECRET:
    raise RuntimeError("TELEGRAM_BACKEND_SECRET is not set")

_headers = {"X-Bot-Secret": BACKEND_SECRET}

async def consume_link_code(code: str, chat_id:str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BACKEND_URL}/internal/telegram/consume",
            json={"code": code, "chatId": chat_id},
            headers=_headers,
        )
    if response.status_code != 200:
        return None
    return response.json()

async def get_user_by_chat_id(chat_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BACKEND_URL}/internal/telegram/user/{chat_id}",
            headers=_headers,
        )
    if response.status_code != 200:
        return None
    return response.json()

async def unlink_user_by_chat_id(chat_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{BACKEND_URL}/internal/telegram/user/{chat_id}",
            headers=_headers,
        )
    return response.status_code == 404

async def get_tasks_by_chat_id(chat_id: str, filter: str = "all"):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BACKEND_URL}/internal/telegram/tasks/{chat_id}",
            params={"filter": filter},
            headers=_headers,
        )
    if response.status_code != 200:
        return None
    return response.json()

async def get_due_reminders():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_URL}/internal/telegram/reminders/due", headers=_headers)
    if response.status_code != 200:
        return None
    return response.json()