import os
import json
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db
from ..core.config import settings, UPLOAD_DIR
from ..models.models import FamilyMemory, GeneratedQuestion, User
from ..services.generative_therapy import GenerativeReminiscenceTherapy

router = APIRouter(prefix="/reminiscence", tags=["Reminiscence Therapy"])

@router.get("/memories")
def list_memories(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Lists all family memories with their associated generated trivia questions."""
    query = db.query(FamilyMemory)
    if user_id:
        query = query.filter(FamilyMemory.user_id == user_id)
    memories = query.order_by(FamilyMemory.created_at.desc()).all()

    result = []
    for m in memories:
        questions = [
            {
                "id": q.id,
                "question_text": q.question_text,
                "options": json.loads(q.options_json),
                "correct_index": q.correct_index,
                "hint": q.hint,
                "warm_explanation": q.warm_explanation,
                "times_played": q.times_played,
                "times_correct": q.times_correct,
            }
            for q in m.questions
        ]
        result.append({
            "id": m.id,
            "title": m.title,
            "event_year": m.event_year,
            "location": m.location,
            "people_in_photo": m.people_in_photo,
            "context_notes": m.context_notes,
            "image_url": f"/uploads/{m.image_filename}",
            "question_count": len(questions),
            "questions": questions,
            "created_at": m.created_at.strftime("%Y-%m-%d"),
        })
    return result

@router.post("/upload")
async def upload_memory_photo(
    file: UploadFile = File(...),
    title: str = Form(...),
    event_year: str = Form("Unknown"),
    location: str = Form("Family Gathering"),
    people_in_photo: str = Form(""),
    context_notes: str = Form(""),
    user_id: int = Form(1),
    auto_generate: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Uploads a new family photo, stores it, and triggers Generative AI
    trivia question generation.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id, full_name="Eleanor Vance")
        db.add(user)
        db.commit()

    # Save image file safely
    file_ext = Path(file.filename).suffix or ".jpg"
    safe_filename = f"mem_{datetime_prefix()}_{Path(file.filename).stem[:20]}{file_ext}"
    target_path = UPLOAD_DIR / safe_filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save FamilyMemory record
    memory = FamilyMemory(
        user_id=user_id,
        image_filename=safe_filename,
        title=title,
        event_year=event_year,
        location=location,
        people_in_photo=people_in_photo,
        context_notes=context_notes,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)

    generated_count = 0
    if auto_generate:
        questions = GenerativeReminiscenceTherapy.generate_questions_for_memory(
            image_path=target_path,
            title=title,
            year=event_year,
            location=location,
            people=people_in_photo,
            context_notes=context_notes,
        )
        for q_data in questions:
            q_record = GeneratedQuestion(
                memory_id=memory.id,
                question_text=q_data["question_text"],
                options_json=json.dumps(q_data["options"]),
                correct_index=q_data.get("correct_index", 0),
                hint=q_data.get("hint", "Think of happy times!"),
                warm_explanation=q_data.get("warm_explanation", "Such a fond memory."),
            )
            db.add(q_record)
            generated_count += 1
        db.commit()

    return {
        "status": "success",
        "memory_id": memory.id,
        "filename": safe_filename,
        "questions_generated": generated_count,
    }

@router.post("/{memory_id}/generate")
def trigger_generation(memory_id: int, api_key: Optional[str] = None, db: Session = Depends(get_db)):
    """Triggers Generative AI question generation for an existing photo."""
    memory = db.query(FamilyMemory).filter(FamilyMemory.id == memory_id).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    image_path = UPLOAD_DIR / memory.image_filename
    questions = GenerativeReminiscenceTherapy.generate_questions_for_memory(
        image_path=image_path,
        title=memory.title,
        year=memory.event_year,
        location=memory.location,
        people=memory.people_in_photo,
        context_notes=memory.context_notes,
        api_key=api_key
    )

    created = []
    for q_data in questions:
        q_record = GeneratedQuestion(
            memory_id=memory.id,
            question_text=q_data["question_text"],
            options_json=json.dumps(q_data["options"]),
            correct_index=q_data.get("correct_index", 0),
            hint=q_data.get("hint", ""),
            warm_explanation=q_data.get("warm_explanation", ""),
        )
        db.add(q_record)
        created.append(q_data["question_text"])
    db.commit()

    return {"status": "generated", "count": len(created), "questions": created}

@router.get("/trivia-game")
def get_reminiscence_trivia_deck(user_id: int = 1, db: Session = Depends(get_db)):
    """
    Returns a playable deck of personalized trivia questions for the senior,
    complete with photo image URL and empathetic hints.
    """
    memories = db.query(FamilyMemory).filter(FamilyMemory.user_id == user_id).all()
    deck = []
    for m in memories:
        for q in m.questions:
            deck.append({
                "question_id": q.id,
                "memory_id": m.id,
                "memory_title": m.title,
                "image_url": f"/uploads/{m.image_filename}",
                "question_text": q.question_text,
                "options": json.loads(q.options_json),
                "correct_index": q.correct_index,
                "hint": q.hint,
                "warm_explanation": q.warm_explanation,
            })
    return deck

def datetime_prefix():
    import datetime
    return datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
