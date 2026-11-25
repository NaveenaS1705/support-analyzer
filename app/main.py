import os
from dotenv import load_dotenv

# --- FIX FOR .ENV ---
current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))

import edge_tts
import io
import re
import shutil
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Body, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq
from pymongo import MongoClient, ReturnDocument
from bson import ObjectId
from bson.errors import InvalidId

# --- CONFIGURATION ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("\n⚠️ WARNING: GROQ_API_KEY is missing! Check your .env file. Using a dummy key.\n")
    GROQ_API_KEY = "dummy_key"

client_ai = Groq(api_key=GROQ_API_KEY)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["support_ticket_db"]
users_collection = db["users"]
tickets_collection = db["tickets"]
counters_collection = db["counters"]

# --- FILE UPLOAD SETUP ---
UPLOAD_DIR = os.path.join(current_dir, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI()
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def get_next_sequence_value(sequence_name):
    counter = counters_collection.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return counter["sequence_value"]

AGENT_USERNAME = "admin"
AGENT_PASSWORD = "agent123"

# --- HELPER FUNCTIONS ---
def clean_and_anonymize(text):
    text = re.sub(' +', ' ', text).strip()
    text = re.sub(r'\S+@\S+', '[EMAIL HIDDEN]', text)
    text = re.sub(r'\b\d{10}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE HIDDEN]', text)
    return text

def serialize_doc(doc):
    doc["id"] = str(doc.get("ticket_id", str(doc["_id"])))
    del doc["_id"]
    return doc

# --- PYDANTIC MODELS ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class AgentLogin(BaseModel):
    username: str
    password: str

class TicketCreate(BaseModel):
    name: str
    email: str
    message: str
    attachment_url: str | None = None

class TicketUpdate(BaseModel):
    status: str

class MessageCreate(BaseModel):
    sender: str
    text: str | None = None
    attachment_url: str | None = None

# --- API ROUTES ---

@app.post("/api/register")
def register(user: UserRegister):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # --- REVERTED TO PLAIN TEXT PASSWORD ---
    users_collection.insert_one({"name": user.name, "email": user.email, "password": user.password})
    return {"message": "User created successfully"}

@app.post("/api/login/user")
def login_user(user: UserLogin):
    # --- REVERTED TO PLAIN TEXT PASSWORD CHECK ---
    db_user = users_collection.find_one({"email": user.email, "password": user.password})
    if db_user:
        return {"name": db_user["name"], "email": db_user["email"]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/login/agent")
def login_agent(agent: AgentLogin):
    if agent.username == AGENT_USERNAME and agent.password == AGENT_PASSWORD:
        return {"name": "Support Agent", "role": "agent"}
    raise HTTPException(status_code=401, detail="Invalid agent credentials")

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"file_url": f"/uploads/{unique_filename}"}

@app.post("/api/tickets")
def create_ticket(ticket: TicketCreate):
    next_id = get_next_sequence_value("ticket_id")
    cleaned_message = clean_and_anonymize(ticket.message)
    
    prompt = f"""
    Analyze this customer support message: "{cleaned_message}"
    
    1. Detect the language of the message.
    2. Translate the message to English for the support agent to read.
    3. Provide the analysis in exactly this format (with no extra text):
    
    Language: (Detected language)
    English Translation: (English translation of the message)
    Category: (e.g., Billing, Technical, Account, Delivery)
    Priority: (Low, Medium, High)
    Sentiment: (Positive, Neutral, Negative)
    Summary: (1 sentence summary in English)
    Suggested Reply (English): (A polite response in English)
    Suggested Reply (Original Language): (The same polite response translated back to the customer's original language)
    """
    
    def extract(pattern, text, default="Unknown"):
        m = re.search(pattern, text)
        return m.group(1).strip() if m else default

    try:
        chat_completion = client_ai.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a multilingual customer support AI."},
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            temperature=0.2,
        )
        
        ai_text = chat_completion.choices[0].message.content
        
        language = extract(r'Language:\s*(.*)', ai_text, "English")
        english_translation = extract(r'English Translation:\s*(.*)', ai_text, cleaned_message)
        category = extract(r'Category:\s*(.*)', ai_text, "General")
        priority = extract(r'Priority:\s*(.*)', ai_text, "Medium")
        sentiment = extract(r'Sentiment:\s*(.*)', ai_text, "Neutral")
        summary = extract(r'Summary:\s*(.*)', ai_text, "No summary available.")
        suggested_reply_eng = extract(r'Suggested Reply \(English\):\s*([\s\S]*?)(?=Suggested Reply \(Original Language\):|$)', ai_text, "We have received your ticket.")
        suggested_reply_orig = extract(r'Suggested Reply \(Original Language\):\s*([\s\S]*)', ai_text, suggested_reply_eng)
        
    except Exception as e:
        print("\n--- AI ERROR ---", e, "\n----------------\n")
        language, english_translation = "English", cleaned_message
        category, priority, sentiment = "General", "Medium", "Neutral"
        summary = "AI analysis failed."
        suggested_reply_eng = "We have received your ticket."
        suggested_reply_orig = "We have received your ticket."

    now = datetime.now(timezone.utc).isoformat()

    ticket_doc = {
        "ticket_id": next_id,
        "customer_name": ticket.name,
        "email": ticket.email,
        "message": cleaned_message,
        "language": language,
        "english_translation": english_translation,
        "category": category,
        "priority": priority,
        "sentiment": sentiment,
        "summary": summary,
        "suggested_reply": suggested_reply_eng,
        "suggested_reply_original": suggested_reply_orig,
        "attachment_url": ticket.attachment_url,
        "messages": [
            {"sender": "customer", "text": cleaned_message, "timestamp": now, "attachment_url": ticket.attachment_url},
            {"sender": "ai", "text": suggested_reply_orig or suggested_reply_eng, "timestamp": now}
        ],
        "status": "Pending"
    }
    
    tickets_collection.insert_one(ticket_doc)
    return {"message": "Ticket created", "ticket_id": next_id}

@app.get("/api/tickets")
def get_tickets():
    tickets = list(tickets_collection.find().sort("ticket_id", -1))
    return [serialize_doc(t) for t in tickets]

@app.get("/api/tickets/user/{email}")
def get_user_tickets(email: str):
    tickets = list(tickets_collection.find({"email": email}).sort("ticket_id", -1))
    return [serialize_doc(t) for t in tickets]

@app.put("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: str, update: TicketUpdate):
    try:
        seq_id = int(ticket_id)
        query = {"ticket_id": seq_id}
    except ValueError:
        try:
            query = {"_id": ObjectId(ticket_id)}
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid Ticket ID format")
        
    result = tickets_collection.update_one(query, {"$set": {"status": update.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket updated successfully"}

@app.post("/api/tickets/{ticket_id}/messages")
def add_message(ticket_id: str, message: MessageCreate):
    try:
        seq_id = int(ticket_id)
        query = {"ticket_id": seq_id}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Ticket ID")

    now = datetime.now(timezone.utc).isoformat()
    
    new_message = {
        "sender": message.sender,
        "timestamp": now
    }
    if message.text:
        new_message["text"] = message.text
    if message.attachment_url:
        new_message["attachment_url"] = message.attachment_url

    result = tickets_collection.update_one(
        query, 
        {"$push": {"messages": new_message}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    return {"message": "Message added"}

@app.post("/api/tts")
async def generate_tts(text: str = Body(..., embed=True), lang: str = Body(..., embed=True)):
    voice_map = {
        "Tamil": "ta-IN-PallaviNeural",
        "Hindi": "hi-IN-SwaraNeural",
        "Telugu": "te-IN-ShrutiNeural",
        "Malayalam": "ml-IN-SobhanaNeural",
        "English": "en-US-AriaNeural"
    }
    voice = voice_map.get(lang, "en-US-AriaNeural")
    communicate = edge_tts.Communicate(text, voice)
    
    async def audio_stream():
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    return StreamingResponse(audio_stream(), media_type="audio/mpeg")

# --- SERVE REACT FRONTEND ---
static_dir = os.path.join(current_dir, "static")

if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            return {"error": "API route not found"}
        
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        return FileResponse(os.path.join(static_dir, "index.html"))