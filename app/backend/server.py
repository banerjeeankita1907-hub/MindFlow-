"from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=[\"bcrypt\"], deprecated=\"auto\")
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = \"HS256\"
JWT_EXPIRATION_DAYS = 30

# AI Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix=\"/api\")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Auth Models
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_streak: int = 0
    longest_streak: int = 0
    total_check_ins: int = 0
    total_journal_entries: int = 0
    total_focus_minutes: int = 0

# Journal Models
class JournalEntryCreate(BaseModel):
    content: str
    mood_score: Optional[int] = None  # 1-10
    tags: Optional[List[str]] = []

class JournalEntry(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    ai_response: Optional[str] = None
    mood_score: Optional[int] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Mood Models
class MoodLogCreate(BaseModel):
    mood_score: int  # 1-10
    energy_level: int  # 1-10
    notes: Optional[str] = None
    activities: Optional[List[str]] = []

class MoodLog(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    mood_score: int
    energy_level: int
    notes: Optional[str] = None
    activities: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = \"medium\"  # low, medium, high
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None

class Task(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    priority: str = \"medium\"
    due_date: Optional[datetime] = None
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Focus Session Models
class FocusSessionCreate(BaseModel):
    duration_minutes: int
    task_description: Optional[str] = None

class FocusSession(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    duration_minutes: int
    task_description: Optional[str] = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

# Goal Models
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    category: Optional[str] = \"personal\"  # personal, health, career, learning

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    category: Optional[str] = None
    progress: Optional[int] = None
    completed: Optional[bool] = None

class Goal(BaseModel):
    model_config = ConfigDict(extra=\"ignore\")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    category: str = \"personal\"
    progress: int = 0  # 0-100
    completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# AI Request Models
class DailyCheckInRequest(BaseModel):
    current_mood: str
    sleep_quality: Optional[str] = None
    energy_level: Optional[str] = None
    goals_for_today: Optional[str] = None

class AIPromptRequest(BaseModel):
    context: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    to_encode.update({\"exp\": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get(\"sub\")
        if user_id is None:
            raise HTTPException(status_code=401, detail=\"Invalid authentication credentials\")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail=\"Invalid authentication credentials\")

async def get_ai_response(prompt: str, system_message: str = \"You are a supportive AI life coach focused on mental wellness and productivity.\") -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_message
        ).with_model(\"openai\", \"gpt-5.2\")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        return response
    except Exception as e:
        logger.error(f\"AI Response Error: {e}\")
        return \"I'm here to support you. Let's focus on your journey today.\"

# ==================== AUTH ROUTES ====================

@api_router.post(\"/auth/register\")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({\"email\": user_data.email}, {\"_id\": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail=\"Email already registered\")
    
    # Create user
    user = User(
        name=user_data.name,
        email=user_data.email
    )
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={\"sub\": user.id})
    
    return {
        \"access_token\": access_token,
        \"token_type\": \"bearer\",
        \"user\": {
            \"id\": user.id,
            \"name\": user.name,
            \"email\": user.email
        }
    }

@api_router.post(\"/auth/login\")
async def login(credentials: UserLogin):
    user_dict = await db.users.find_one({\"email\": credentials.email}, {\"_id\": 0})
    if not user_dict:
        raise HTTPException(status_code=401, detail=\"Invalid email or password\")
    
    if not verify_password(credentials.password, user_dict['password']):
        raise HTTPException(status_code=401, detail=\"Invalid email or password\")
    
    access_token = create_access_token(data={\"sub\": user_dict['id']})
    
    return {
        \"access_token\": access_token,
        \"token_type\": \"bearer\",
        \"user\": {
            \"id\": user_dict['id'],
            \"name\": user_dict['name'],
            \"email\": user_dict['email']
        }
    }

@api_router.get(\"/users/profile\")
async def get_profile(token: str):
    user_id = await get_current_user(token)
    user_dict = await db.users.find_one({\"id\": user_id}, {\"_id\": 0, \"password\": 0})
    if not user_dict:
        raise HTTPException(status_code=404, detail=\"User not found\")
    return user_dict

# ==================== AI COACH ROUTES ====================

@api_router.post(\"/ai/daily-checkin\")
async def daily_checkin(request: DailyCheckInRequest, token: str):
    user_id = await get_current_user(token)
    
    prompt = f\"\"\"
    I'm starting my day and here's how I'm feeling:
    - Current mood: {request.current_mood}
    - Sleep quality: {request.sleep_quality or 'Not specified'}
    - Energy level: {request.energy_level or 'Not specified'}
    - Goals for today: {request.goals_for_today or 'Not specified'}
    
    Please provide me with:
    1. A brief, encouraging message
    2. 2-3 specific, actionable suggestions for making today great
    3. One mindfulness tip
    
    Keep it concise, warm, and practical (max 150 words).
    \"\"\"
    
    ai_response = await get_ai_response(prompt)
    
    # Update user streak
    user = await db.users.find_one({\"id\": user_id}, {\"_id\": 0})
    if user:
        await db.users.update_one(
            {\"id\": user_id},
            {\"$inc\": {\"total_check_ins\": 1, \"current_streak\": 1}}
        )
    
    return {\"message\": ai_response}

@api_router.post(\"/ai/journal-prompt\")
async def get_journal_prompt(request: AIPromptRequest, token: str):
    user_id = await get_current_user(token)
    
    prompts = [
        \"What are three things you're grateful for today, and why do they matter to you?\",
        \"Describe a moment today when you felt truly present. What made it special?\",
        \"What challenge are you facing right now? What's one small step you could take?\",
        \"If you could give your past self one piece of advice, what would it be?\",
        \"What does your ideal day look like? What's stopping you from having more days like that?\",
        \"Write about someone who positively influenced you recently. How did they impact you?\",
        \"What patterns do you notice in your thoughts and feelings lately?\",
        \"What would you do today if you knew you couldn't fail?\",
        \"How have you grown in the past month? What evidence do you see?\",
        \"What are you avoiding? What would happen if you faced it?\"
    ]
    
    return {\"prompt\": random.choice(prompts)}

@api_router.post(\"/ai/insights\")
async def get_ai_insights(token: str):
    user_id = await get_current_user(token)
    
    # Get recent data
    recent_moods = await db.mood_logs.find({\"user_id\": user_id}).sort(\"created_at\", -1).limit(7).to_list(7)
    recent_journals = await db.journal_entries.find({\"user_id\": user_id}).sort(\"created_at\", -1).limit(3).to_list(3)
    user = await db.users.find_one({\"id\": user_id}, {\"_id\": 0})
    
    avg_mood = sum([m['mood_score'] for m in recent_moods]) / len(recent_moods) if recent_moods else 5
    
    prompt = f\"\"\"
    Based on this user's recent data, provide personalized insights:
    - Average mood (last 7 days): {avg_mood:.1f}/10
    - Current streak: {user.get('current_streak', 0)} days
    - Total check-ins: {user.get('total_check_ins', 0)}
    - Recent journal entries: {len(recent_journals)}
    
    Provide:
    1. One key observation about their patterns
    2. One specific, actionable recommendation
    3. One encouraging insight
    
    Be supportive, specific, and actionable. Max 120 words.
    \"\"\"
    
    ai_response = await get_ai_response(prompt)
    
    return {\"insights\": ai_response}

# ==================== JOURNAL ROUTES ====================

@api_router.post(\"/journal/entry\")
async def create_journal_entry(entry: JournalEntryCreate, token: str):
    user_id = await get_current_user(token)
    
    # Get AI response to journal entry
    ai_prompt = f\"\"\"
    Someone just journaled this:
    \"{entry.content}\"
    
    Provide a brief, empathetic, and insightful response. Acknowledge their feelings, 
    offer a gentle perspective or question to deepen their reflection. Max 100 words.
    \"\"\"
    
    ai_response = await get_ai_response(ai_prompt, \"You are a compassionate journal companion who helps people process their thoughts and feelings.\")
    
    journal_entry = JournalEntry(
        user_id=user_id,
        content=entry.content,
        ai_response=ai_response,
        mood_score=entry.mood_score,
        tags=entry.tags or []
    )
    
    entry_dict = journal_entry.model_dump()
    entry_dict['created_at'] = entry_dict['created_at'].isoformat()
    
    await db.journal_entries.insert_one(entry_dict)
    
    # Update user stats
    await db.users.update_one(
        {\"id\": user_id},
        {\"$inc\": {\"total_journal_entries\": 1}}
    )
    
    return journal_entry

@api_router.get(\"/journal/entries\")
async def get_journal_entries(token: str, limit: int = 20):
    user_id = await get_current_user(token)
    
    entries = await db.journal_entries.find(
        {\"user_id\": user_id}
    ).sort(\"created_at\", -1).limit(limit).to_list(limit)
    
    for entry in entries:
        if isinstance(entry.get('created_at'), str):
            entry['created_at'] = datetime.fromisoformat(entry['created_at'])
    
    return entries

# ==================== MOOD TRACKING ROUTES ====================

@api_router.post(\"/mood/log\")
async def log_mood(mood_data: MoodLogCreate, token: str):
    user_id = await get_current_user(token)
    
    mood_log = MoodLog(
        user_id=user_id,
        mood_score=mood_data.mood_score,
        energy_level=mood_data.energy_level,
        notes=mood_data.notes,
        activities=mood_data.activities or []
    )
    
    log_dict = mood_log.model_dump()
    log_dict['created_at'] = log_dict['created_at'].isoformat()
    
    await db.mood_logs.insert_one(log_dict)
    
    return mood_log

@api_router.get(\"/mood/history\")
async def get_mood_history(token: str, days: int = 30):
    user_id = await get_current_user(token)
    
    since_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    moods = await db.mood_logs.find(
        {\"user_id\": user_id}
    ).sort(\"created_at\", -1).to_list(100)
    
    for mood in moods:
        if isinstance(mood.get('created_at'), str):
            mood['created_at'] = datetime.fromisoformat(mood['created_at'])
    
    return moods

@api_router.get(\"/mood/analytics\")
async def get_mood_analytics(token: str):
    user_id = await get_current_user(token)
    
    moods = await db.mood_logs.find({\"user_id\": user_id}).sort(\"created_at\", -1).limit(30).to_list(30)
    
    if not moods:
        return {
            \"average_mood\": 5,
            \"average_energy\": 5,
            \"trend\": \"stable\",
            \"total_logs\": 0
        }
    
    avg_mood = sum([m['mood_score'] for m in moods]) / len(moods)
    avg_energy = sum([m['energy_level'] for m in moods]) / len(moods)
    
    # Simple trend calculation
    recent_avg = sum([m['mood_score'] for m in moods[:7]]) / min(7, len(moods))
    older_avg = sum([m['mood_score'] for m in moods[7:14]]) / max(1, min(7, len(moods[7:14])))
    
    trend = \"improving\" if recent_avg > older_avg + 0.5 else \"declining\" if recent_avg < older_avg - 0.5 else \"stable\"
    
    return {
        \"average_mood\": round(avg_mood, 1),
        \"average_energy\": round(avg_energy, 1),
        \"trend\": trend,
        \"total_logs\": len(moods)
    }

# ==================== TASK ROUTES ====================

@api_router.post(\"/tasks\")
async def create_task(task_data: TaskCreate, token: str):
    user_id = await get_current_user(token)
    
    task = Task(
        user_id=user_id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority or \"medium\",
        due_date=task_data.due_date
    )
    
    task_dict = task.model_dump()
    task_dict['created_at'] = task_dict['created_at'].isoformat()
    if task_dict.get('due_date'):
        task_dict['due_date'] = task_dict['due_date'].isoformat()
    
    await db.tasks.insert_one(task_dict)
    
    return task

@api_router.get(\"/tasks\")
async def get_tasks(token: str, completed: Optional[bool] = None):
    user_id = await get_current_user(token)
    
    query = {\"user_id\": user_id}
    if completed is not None:
        query[\"completed\"] = completed
    
    tasks = await db.tasks.find(query).sort(\"created_at\", -1).to_list(100)
    
    for task in tasks:
        if isinstance(task.get('created_at'), str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if task.get('due_date') and isinstance(task['due_date'], str):
            task['due_date'] = datetime.fromisoformat(task['due_date'])
    
    return tasks

@api_router.patch(\"/tasks/{task_id}\")
async def update_task(task_id: str, task_data: TaskUpdate, token: str):
    user_id = await get_current_user(token)
    
    update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
    if update_data.get('due_date'):
        update_data['due_date'] = update_data['due_date'].isoformat()
    
    result = await db.tasks.update_one(
        {\"id\": task_id, \"user_id\": user_id},
        {\"$set\": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Task not found\")
    
    updated_task = await db.tasks.find_one({\"id\": task_id}, {\"_id\": 0})
    return updated_task

@api_router.delete(\"/tasks/{task_id}\")
async def delete_task(task_id: str, token: str):
    user_id = await get_current_user(token)
    
    result = await db.tasks.delete_one({\"id\": task_id, \"user_id\": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=\"Task not found\")
    
    return {\"message\": \"Task deleted successfully\"}

# ==================== FOCUS SESSION ROUTES ====================

@api_router.post(\"/focus/start\")
async def start_focus_session(session_data: FocusSessionCreate, token: str):
    user_id = await get_current_user(token)
    
    session = FocusSession(
        user_id=user_id,
        duration_minutes=session_data.duration_minutes,
        task_description=session_data.task_description
    )
    
    session_dict = session.model_dump()
    session_dict['started_at'] = session_dict['started_at'].isoformat()
    
    await db.focus_sessions.insert_one(session_dict)
    
    return session

@api_router.post(\"/focus/complete/{session_id}\")
async def complete_focus_session(session_id: str, token: str):
    user_id = await get_current_user(token)
    
    session = await db.focus_sessions.find_one({\"id\": session_id, \"user_id\": user_id}, {\"_id\": 0})
    if not session:
        raise HTTPException(status_code=404, detail=\"Session not found\")
    
    completed_at = datetime.now(timezone.utc).isoformat()
    
    await db.focus_sessions.update_one(
        {\"id\": session_id},
        {\"$set\": {\"completed_at\": completed_at}}
    )
    
    # Update user stats
    await db.users.update_one(
        {\"id\": user_id},
        {\"$inc\": {\"total_focus_minutes\": session['duration_minutes']}}
    )
    
    return {\"message\": \"Session completed\", \"completed_at\": completed_at}

@api_router.get(\"/focus/history\")
async def get_focus_history(token: str, limit: int = 20):
    user_id = await get_current_user(token)
    
    sessions = await db.focus_sessions.find(
        {\"user_id\": user_id}
    ).sort(\"started_at\", -1).limit(limit).to_list(limit)
    
    for session in sessions:
        if isinstance(session.get('started_at'), str):
            session['started_at'] = datetime.fromisoformat(session['started_at'])
        if session.get('completed_at') and isinstance(session['completed_at'], str):
            session['completed_at'] = datetime.fromisoformat(session['completed_at'])
    
    return sessions

# ==================== GOALS ROUTES ====================

@api_router.post(\"/goals\")
async def create_goal(goal_data: GoalCreate, token: str):
    user_id = await get_current_user(token)
    
    goal = Goal(
        user_id=user_id,
        title=goal_data.title,
        description=goal_data.description,
        target_date=goal_data.target_date,
        category=goal_data.category or \"personal\"
    )
    
    goal_dict = goal.model_dump()
    goal_dict['created_at'] = goal_dict['created_at'].isoformat()
    if goal_dict.get('target_date'):
        goal_dict['target_date'] = goal_dict['target_date'].isoformat()
    
    await db.goals.insert_one(goal_dict)
    
    return goal

@api_router.get(\"/goals\")
async def get_goals(token: str, completed: Optional[bool] = None):
    user_id = await get_current_user(token)
    
    query = {\"user_id\": user_id}
    if completed is not None:
        query[\"completed\"] = completed
    
    goals = await db.goals.find(query).sort(\"created_at\", -1).to_list(100)
    
    for goal in goals:
        if isinstance(goal.get('created_at'), str):
            goal['created_at'] = datetime.fromisoformat(goal['created_at'])
        if goal.get('target_date') and isinstance(goal['target_date'], str):
            goal['target_date'] = datetime.fromisoformat(goal['target_date'])
    
    return goals

@api_router.patch(\"/goals/{goal_id}\")
async def update_goal(goal_id: str, goal_data: GoalUpdate, token: str):
    user_id = await get_current_user(token)
    
    update_data = {k: v for k, v in goal_data.model_dump().items() if v is not None}
    if update_data.get('target_date'):
        update_data['target_date'] = update_data['target_date'].isoformat()
    
    result = await db.goals.update_one(
        {\"id\": goal_id, \"user_id\": user_id},
        {\"$set\": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=\"Goal not found\")
    
    updated_goal = await db.goals.find_one({\"id\": goal_id}, {\"_id\": 0})
    return updated_goal

# ==================== ANALYTICS ROUTES ====================

@api_router.get(\"/analytics/dashboard\")
async def get_dashboard_analytics(token: str):
    user_id = await get_current_user(token)
    
    # Get user stats
    user = await db.users.find_one({\"id\": user_id}, {\"_id\": 0, \"password\": 0})
    
    # Get recent mood data
    recent_moods = await db.mood_logs.find({\"user_id\": user_id}).sort(\"created_at\", -1).limit(7).to_list(7)
    
    # Get task completion rate
    total_tasks = await db.tasks.count_documents({\"user_id\": user_id})
    completed_tasks = await db.tasks.count_documents({\"user_id\": user_id, \"completed\": True})
    
    # Get focus time this week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_sessions = await db.focus_sessions.find({\"user_id\": user_id}).to_list(100)
    
    weekly_focus_minutes = sum([
        s['duration_minutes'] for s in recent_sessions 
        if isinstance(s.get('started_at'), str) and datetime.fromisoformat(s['started_at']) > week_ago
    ])
    
    return {
        \"current_streak\": user.get(\"current_streak\", 0),
        \"longest_streak\": user.get(\"longest_streak\", 0),
        \"total_check_ins\": user.get(\"total_check_ins\", 0),
        \"total_journal_entries\": user.get(\"total_journal_entries\", 0),
        \"total_focus_minutes\": user.get(\"total_focus_minutes\", 0),
        \"weekly_focus_minutes\": weekly_focus_minutes,
        \"task_completion_rate\": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
        \"average_mood_7days\": round(sum([m['mood_score'] for m in recent_moods]) / len(recent_moods), 1) if recent_moods else 5.0
    }

# ==================== ROOT ROUTE ====================

@api_router.get(\"/\")
async def root():
    return {\"message\": \"MindFlow API - Your AI-Powered Life Optimization Platform\"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

@app.on_event(\"shutdown\")
async def shutdown_db_client():
    client.close()
"
Observation: Overwrite successful: /app/backend/server.py
