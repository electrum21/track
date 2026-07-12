import os
import asyncio
from dotenv import load_dotenv
from api_client import *
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, BotCommand, Update
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from telegram.error import Forbidden

load_dotenv()

# Load environment variables
API_TOKEN = os.getenv("TELEGRAM_API_TOKEN")
BOT_HANDLE = os.getenv("TELEGRAM_BOT_HANDLE")
BACKEND_SECRET = os.getenv("TELEGRAM_BACKEND_SECRET")

print('Bot is now starting up...')


# Keyboard markups

open_ntutrack_keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton("Open NTUTrack", url="https://track-edu.vercel.app")]
])

unlink_user_from_ntutrack_keyboard = InlineKeyboardMarkup([
    [
        InlineKeyboardButton("Confirm unlink", callback_data="unlink_confirm"),
        InlineKeyboardButton("Cancel", callback_data="unlink_cancel"),
    ]
])

# Function to format list of tasks for sending message
def format_tasks(tasks: list):
    if not tasks:
        return "No tasks found."

    lines = []
    tasks.sort(key=lambda task: task.get("moduleCode", ""))
    for task in tasks:
        due_date = task.get("dueDate") or "No Date"
        due_time = task.get("dueTime") or "No Time"
        lines.append(f"• [{task['moduleCode']}]\t | {task['title']} | Due {due_date} {due_time}")
    return "\n".join(lines)


# Command to start the bot (/start)
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.message.chat.id)

    # t.me/ntutrackbot?start=<code>
    if context.args:
        code = context.args[0]
        user = await consume_link_code(code, chat_id)
        if user:
            await update.message.reply_text(
                f"Linked to {user['name']} ({user['email']})! You'll get reminders for overdue and upcoming assignments here."
            )
        else:
            await update.message.reply_text(
                "That link code is invalid or expired. Generate a new one from NTUTrack's settings and try again."
            )
        return

    # no code; check if this chat is already linked
    user = await get_user_by_chat_id(chat_id)
    if user:
        await update.message.reply_text(f"Welcome back, {user['name']}!")
    else:
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("Open NTUTrack", url="https://track-edu.vercel.app")]
        ])

        await update.message.reply_text(
            "You have not created a profile on NTUTrack. Log in and go to Settings to generate a linking code.",
            reply_markup=open_ntutrack_keyboard
        )

# Command to start the bot (/profile)
async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.message.chat.id)
    user = await get_user_by_chat_id(chat_id)
    if user:
        profile_text = f"""
        <b>Profile Information</b>\n
        Name: {user['name']}
        Email: {user['email']}
        """
        await update.message.reply_text(profile_text, parse_mode="HTML")
    else:
        await update.message.reply_text(
            "You have not created a profile on NTUTrack. Log in and go to Settings to generate a linking code.",
            reply_markup=open_ntutrack_keyboard
        )


# Function for linking account
async def try_link(update: Update, code: str, chat_id: str):
    existing = await get_user_by_chat_id(chat_id)
    if existing:
        await update.message.reply_text(
            f"This chat is already linked to {existing['email']}. "
            "Unlink first (in NTUTrack Settings) if you want to connect a different account."
        )
        return

    user = await consume_link_code(code, chat_id)
    if user:
        await update.message.reply_text(
            f"Linked to {user['name']} ({user['email']})! You'll get reminders for overdue and upcoming assignments here."
        )
    else:
        await update.message.reply_text(
            "That link code is invalid or expired. Generate a new one from NTUTrack's settings and try again.",
            reply_markup=open_ntutrack_keyboard
        )


# Command to link account via Telegram bot, instead of from NTUTrack
async def link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.message.chat.id)

    if not context.args:
        existing = await get_user_by_chat_id(chat_id)
        if existing:
            await update.message.reply_text(
                f"This chat is already linked to {existing['email']}. "
                "Unlink first (in NTUTrack Settings) if you want to connect a different account."
            )
            return

        await update.message.reply_text(
            "Usage: /link <code>\nGenerate a code from NTUTrack's Settings panel first."
        )
        return

    code = context.args[0]
    await try_link(update, code, chat_id)


# Command to unlink account via Telegram bot, instead of from NTUTrack
async def unlink(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.message.chat.id)

    user = await get_user_by_chat_id(chat_id)
    if not user:
        await update.message.reply_text("This chat is not linked to an NTUTrack account.")
        return

    await update.message.reply_text(
        f"Unlink this chat from {user['name']} ({user['email']})? You'll stop receiving reminders until you link again.",
        reply_markup=unlink_user_from_ntutrack_keyboard
    )


# Function for handling the unlink callback (cancel/confirm)
async def handle_unlink_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    chat_id = str(query.message.chat.id)

    if query.data == "unlink_cancel":
        await query.edit_message_text("Unlink has been cancelled.")
    
    if query.data == "unlink_confirm":
        success = await unlink_user_by_chat_id(chat_id)
        if success:
            await query.edit_message_text(
                "Your account has been unlinked. To link an account again, open NTUTrack and login to generate your link code. Open Telegram from NTUTrack or use the command /link <code> after generating the code.",
                reply_markup=open_ntutrack_keyboard
                )
        else:
            await query.edit_message_text("An error has occurred. Please try again.")    


# Command to fetch tasks from NTUTrack
async def fetch_tasks(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.message.chat.id)

    if not context.args:
        await update.message.reply_text(
            "Usage: /tasks <filter>\n\n" \
            "all - Fetch all tasks\n" \
            "overdue - Fetch overdue tasks\n" \
            "today - Fetch tasks due today"
        )
        return

    filter = context.args[0]
    user = await get_user_by_chat_id(chat_id)
    if user:
        tasks = await get_tasks_by_chat_id(chat_id, filter)
        tasks_message = format_tasks(tasks)
        await update.message.reply_text(tasks_message)
    else:
        await update.message.reply_text(
            "You have not created a profile on NTUTrack. Log in and go to Settings to generate a linking code.",
            reply_markup=open_ntutrack_keyboard
        )


# Command for sending reminders for tasks overdue/due soon
async def send_reminders(context: ContextTypes.DEFAULT_TYPE):
    try:
        reminders = await get_due_reminders()
    except Exception as e:
        print(f"send_reminders: failed to fetch due reminders: {e}")
        return

    if reminders is None:
        print("Failed to fetch due reminders")
        return

    for chat_id, tasks in reminders.items():
        text = f"Reminder: these tasks are due soon, or already overdue:\n{format_tasks(tasks)}"
        try:
            await context.bot.send_message(chat_id=chat_id, text=text)
        except Forbidden:
            print(f"Chat {chat_id} has blocked the bot - skipping")
        except Exception as e:
            print(f"Failed to send reminder to {chat_id}: {e}")


# Command to provide help information
async def help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "<b>NTUTrack Bot</b>\n"
        "Get reminders for overdue and upcoming assignments, right here in Telegram.\n\n"

        "<b>Getting started</b>\n"
        "/start - Link this chat to your NTUTrack account (via a code from Settings), or check your link status\n"
        "/link &lt;code&gt; - Link manually if you already have a code\n"
        "/unlink - Disconnect this chat from your account\n\n"

        "<b>Your tasks</b>\n"
        "/tasks all - Show everything\n"
        "/tasks overdue - Show only overdue tasks\n"
        "/tasks today - Show what's due today\n\n"

        "<b>Account</b>\n"
        "/profile - View your linked account info\n\n"

        "Once linked, you'll also get automatic reminders for overdue and soon-due tasks - no command needed."
    )
    await update.message.reply_text(help_text, parse_mode="HTML")


# Set the commands menu for the bot
async def post_init(application: Application):
    commands = [
        BotCommand(command="start", description="Default command for launching the NTUTrack bot"),
        BotCommand(command="help", description="Display all bot commands available"),
        BotCommand(command="profile", description="Display your profile summary"),
        BotCommand(command="link", description="Link account manually using code: /link <code>"),
        BotCommand(command="unlink", description="Unlink this chat from your NTUTrack account"),
        BotCommand(command="tasks", description="Fetch your tasks using filters: /tasks <all|overdue|today>"),
    ]
    await application.bot.set_my_commands(commands)


# Log errors
async def log_error(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print(f'Update {update} caused error {context.error}')


# Start the bot
if __name__ == '__main__':
    app = Application.builder().token(API_TOKEN).post_init(post_init).build()

    # Register command handlers
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('help', help))
    app.add_handler(CommandHandler('profile', profile))
    app.add_handler(CommandHandler('link', link))
    app.add_handler(CommandHandler('unlink', unlink))
    app.add_handler(CommandHandler('tasks', fetch_tasks))
    app.add_handler(CallbackQueryHandler(handle_unlink_callback))

    # Register error handler
    app.add_error_handler(log_error)

    # Run a repeating job (daily) to send out task reminders
    app.job_queue.run_repeating(send_reminders, interval=86400, first=10)  # every day

    print('Starting polling...')
    # Run the bot
    app.run_polling(poll_interval=1)