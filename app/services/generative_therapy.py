"""
Generative Memory Therapy Service
Powered by Generative AI & Multimodal RAG (Retrieval-Augmented Generation).
Parses uploaded family photos and caregiver backstory to automatically generate
personalized reminiscence trivia questions.
"""
import os
import json
import base64
from pathlib import Path
from typing import List, Dict, Any, Optional
from ..core.config import settings

# Attempt import of Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class GenerativeReminiscenceTherapy:
    """
    Multimodal Question Generation for elderly reminiscence therapy.
    """

    SYSTEM_PROMPT = """
You are an empathetic, clinical neuropsychology AI assistant specializing in reminiscence therapy for elderly individuals with Mild Cognitive Impairment (MCI) or early Alzheimer's.
Your goal is to generate warm, emotionally uplifting, accessible multiple-choice questions from a personal family photograph and caregiver context.

Guidelines:
1. Focus on positive emotional anchors (family members, cherished vacation spots, celebrations, milestones, pets).
2. Never make questions frustrating, clinical, or overly tricky.
3. Provide 4 choices where 1 is correct and the other 3 are plausible, gentle alternatives.
4. Include a reassuring 'hint' and a 'warm_explanation' that reinforces the happy memory.
5. Return strictly a JSON array of question objects adhering to this schema:
[
  {
    "question_text": "Who is standing beside you in front of the summer cabin?",
    "options": ["Your daughter Sarah", "Your sister Helen", "Neighbor Arthur", "Cousin David"],
    "correct_index": 0,
    "hint": "Think of the sunny fishing trip in Maine.",
    "warm_explanation": "That's right! Sarah caught her very first bass on that wonderful afternoon."
  }
]
"""

    @classmethod
    def _read_image_base64(cls, image_path: Path) -> Optional[str]:
        """Reads image file and returns base64 encoded string."""
        if not image_path.exists():
            return None
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode("utf-8")

    @classmethod
    def generate_questions_for_memory(
        cls,
        image_path: Path,
        title: str,
        year: str,
        location: str,
        people: str,
        context_notes: str,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates personalized trivia questions using Gemini Multimodal AI
        with seamless fallback to intelligent template generation if offline or key is unset.
        """
        active_key = api_key or settings.GEMINI_API_KEY
        
        # 1. Attempt Live Gemini API generation if key is provided
        if active_key and GENAI_AVAILABLE and image_path.exists():
            try:
                client = genai.Client(api_key=active_key)
                
                # Load image bytes
                with open(image_path, "rb") as f:
                    image_bytes = f.read()

                prompt_content = f"""
                Photo Title: {title}
                Approximate Year: {year}
                Location / Setting: {location}
                People in Photo: {people}
                Caregiver Backstory: {context_notes}

                Generate 2 to 3 personalized reminiscence therapy questions based on this photo and backstory.
                Follow the JSON array format strictly.
                """

                # Call Gemini
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        prompt_content,
                    ],
                    config=types.GenerateContentConfig(
                        system_instruction=cls.SYSTEM_PROMPT,
                        response_mime_type="application/json"
                    )
                )

                if response.text:
                    parsed = json.loads(response.text)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        return parsed
            except Exception as e:
                print(f"[GenerativeTherapy] Gemini API call exception, falling back to local heuristic: {e}")

        # 2. Intelligent Heuristic / Template RAG Fallback
        return cls._generate_heuristic_questions(title, year, location, people, context_notes)

    @classmethod
    def _generate_heuristic_questions(
        cls,
        title: str,
        year: str,
        location: str,
        people: str,
        context_notes: str
    ) -> List[Dict[str, Any]]:
        """
        Provides high quality, contextual questions even when offline or without API key.
        """
        questions = []
        people_list = [p.strip() for p in people.split(",") if p.strip()]
        
        # Question 1: Location / Setting Recall
        if location and location.lower() != "unknown":
            loc_options = [
                location,
                "The Old Mountain Lakehouse",
                "Grandma's Downtown Garden",
                "The Seaside Boardwalk"
            ]
            # Ensure unique options
            loc_options = list(dict.fromkeys(loc_options))
            questions.append({
                "question_text": f"Do you remember where this special memory of '{title}' took place?",
                "options": loc_options[:4],
                "correct_index": 0,
                "hint": f"It was a scenic place known for {location}.",
                "warm_explanation": f"Yes, indeed! This cherished moment was spent in {location}."
            })

        # Question 2: People / Relatives Recall
        if people_list:
            primary_person = people_list[0]
            person_options = [
                primary_person,
                "Your high school neighbor Robert",
                "Cousin Eleanor from Ohio",
                "Doctor Williams"
            ]
            questions.append({
                "question_text": f"Who is by your side sharing this smile in '{title}'?",
                "options": person_options,
                "correct_index": 0,
                "hint": f"It's someone very dear to your heart: {primary_person}.",
                "warm_explanation": f"Wonderful! {primary_person} always loved celebrating these family moments with you."
            })

        # Question 3: Time Period / Event Recall
        if year and year.lower() != "unknown":
            try:
                base_year = int("".join(filter(str.isdigit, year))[:4])
                year_options = [
                    f"Around {base_year}",
                    f"In the summer of {base_year - 7}",
                    f"Back in {base_year + 9}",
                    f"Winter of {base_year - 15}"
                ]
            except Exception:
                year_options = [
                    f"Around {year}",
                    "During early elementary school days",
                    "Just after college graduation",
                    "On our 50th wedding anniversary"
                ]

            questions.append({
                "question_text": f"Around what era or time in life was this picture taken?",
                "options": year_options,
                "correct_index": 0,
                "hint": f"Notice the styles and fashion from around {year}.",
                "warm_explanation": f"Spot on! It was around {year}, such a memorable chapter of life."
            })

        # Fallback if fields were sparse
        if not questions:
            questions.append({
                "question_text": f"Looking closely at this photo titled '{title}', what feelings or event does it bring back?",
                "options": [
                    "A joyful family celebration full of laughter",
                    "A quiet weekend spent reading in the study",
                    "A busy day commuting to the old office",
                    "A rainy afternoon sorting old stamps"
                ],
                "correct_index": 0,
                "hint": "Look at the cheerful expressions in the picture.",
                "warm_explanation": f"Exactly! This was a joyful family occasion: {context_notes or 'a wonderful gathering'}."
            })

        return questions
