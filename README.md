# CognitiveAssist 🧠
### An AI-Powered Cognitive Gaming & Health Monitoring Platform for Elderly Care
**Domain:** Healthcare, Computer Vision & Generative AI  
**Target Users:** Elderly Individuals (MCI & Early Alzheimer's), Caregivers, and Healthcare Providers  
**Project Type:** Healthcare AI & Cognitive Assistive Platform  

---

## 1. Executive Summary & Clinical Background
Cognitive decline, Mild Cognitive Impairment (MCI), and early-stage Alzheimer's affect over 55 million seniors worldwide. Traditional brain-training games suffer from three critical shortcomings:
1. **Static Challenge Levels**: Games do not adapt in real-time when the senior exhibits drowsiness, eye strain, or frustration.
2. **Lack of Personalization**: Generic crosswords lack personal emotional resonance, which is essential for autobiographical memory retrieval in reminiscence therapy.
3. **Caregiver Blind Spots**: Families and clinicians lack continuous, objective biomarkers tracking subtle motor-cognitive slowdowns between medical visits.

**CognitiveAssist** solves this through a unified four-module closed-loop architecture combining real-time computer vision, dynamic reinforcement/rule-based difficulty scaling, multimodal generative AI, and longitudinal predictive analytics.

---

## 2. System Architecture

```
                 +-------------------------------------------------------------+
                 |                     SENIOR USER INTERFACE                   |
                 |  (High-Contrast WCAG AAA, Large Tactile UI, Audio Narration)|
                 +-------------------------------------------------------------+
                        |                                       ^
         Webcam Frames  |                                       | Adaptive Interventions
                        v                                       | (Time adjustments, hints)
                 +-----------------------+              +------------------------+
                 |  COMPUTER VISION HUD  |              | ADAPTIVE GAME ENGINE   |
                 |  (In-Browser MediaPipe|              | (Dynamic Difficulty,   |
                 |  EAR, MAR, Head Pose) |              |  Streak Scaling)       |
                 +-----------------------+              +------------------------+
                        |                                       ^
         Telemetry Packets                                      | Adaptive Step Query
                        v                                       v
+---------------------------------------------------------------------------------------+
|                                FASTAPI BACKEND SERVICES                               |
|                                                                                       |
|  [cv_fatigue_tracker]    [adaptive_engine]    [generative_therapy]  [analytics_engine]|
|  - EAR calculation      - Dynamic Elo / DDA  - Gemini Multimodal RAG- CRI Index       |
|  - Yawn (MAR) detection - Assistance rules   - Photo-to-Trivia      - Anomaly alerts  |
|  - Head Pose Euler      - Pace relaxation    - Empathetic feedback  - Trend regression|
+---------------------------------------------------------------------------------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |     SQLITE DATABASE (SQLAlchemy ORM)        |
                 |  Users, Sessions, Telemetry, Memories, Alerts|
                 +---------------------------------------------+
                                        |
                                        v
                 +---------------------------------------------+
                 |       CAREGIVER & DOCTOR ANALYTICS PORTAL   |
                 |  (CRI Trends, Latency Charts, Medical Export|
                 +---------------------------------------------+
```

---

## 3. Proposed Core Modules

### Module 1: Adaptive Game Engine
- **Technical Functionality**: Reinforcement learning & rule-based Dynamic Difficulty Adjustment (DDA).
- **Clinical Value**: Prevents agitation and catastrophic cognitive burnout in seniors. When fatigue or frustration is detected, the engine dynamically relaxes round countdowns, highlights visual clues, or steps down grid complexity (e.g. from 3x4 to 2x3). Conversely, sustained streaks with low fatigue promote neuroplastic progression.
- **Included Games**:
  - *Memory Matrix*: Spatial pattern and card recall with dynamic grids (2x2 to 4x4).
  - *Reaction & Focus*: Stroop color-inhibition reaction latency test measuring motor-cognitive speed in milliseconds.
  - *Family Reminiscence Trivia*: Autobiographical memory retrieval powered by generative AI.

### Module 2: Engagement & Fatigue Monitor
- **Technical Functionality**: Computer vision pipeline using OpenCV and MediaPipe 468-point facial mesh.
- **Biomarkers Calculated**:
  - **Eye Aspect Ratio (EAR)**: Computes 6-point Euclidean ratios across left and right eyes to detect blinks and eyelid drooping / microsleep ($\text{EAR} < 0.22$).
  - **Mouth Aspect Ratio (MAR)**: Monitors vertical mouth displacement to flag yawning episodes ($\text{MAR} > 0.65$).
  - **3D Head Pose Estimation**: Tracks Euler angles (Pitch, Yaw, Roll) to identify head dropping / posture slouching or gaze distraction.
  - **Composite Fatigue Score (0–100)**: Multi-factor index updating at 30 FPS.
- **Dual Delivery**:
  - *In-Browser Live HUD*: Real-time webcam overlay running directly in the browser via Canvas & MediaPipe. Includes a simulation slider for offline testing.
  - *Standalone Python Tool (`cv_standalone/fatigue_detector.py`)*: Native OpenCV window designed for lab benchmarks and live demonstrations.

### Module 3: Generative Memory Therapy
- **Technical Functionality**: Multimodal RAG powered by Google Gemini Vision.
- **Clinical Value**: Reminiscence therapy stimulates dormant neural pathways by pairing familiar photographic stimuli with guided questions.
- **Functionality**:
  - Caregivers upload family photographs with historic details (year, location, relatives, anecdotes).
  - Multimodal Vision AI inspects the photo and context to generate personalized multiple-choice trivia questions with positive emotional reinforcement.
  - Built-in Web Speech Synthesis reads questions aloud for seniors with low vision.
  - Intelligent local heuristic fallback ensures zero demonstration failures even if an API key is absent.

### Module 4: Caregiver & Doctor Analytics Portal
- **Technical Functionality**: Interactive clinical dashboard with longitudinal predictive trend analytics.
- **Metrics Tracked**:
  - **Cognitive Retention Index (CRI)**: Weighted composite of recall accuracy (45%), reaction latency efficiency (35%), and cognitive endurance (20%).
  - **Reaction Latency Progression (ms)**: Digital biomarker measuring motor-cognitive processing speed over weeks.
  - **Fatigue vs. Accuracy Correlation**: Scatter and dual-axis visualization showing how exhaustion directly impacts accuracy.
  - **Automated Anomaly Alerts**: Flags sudden latency spikes (+30%) or chronic fatigue clusters for doctor review.
  - **Printable Clinical Summary Report**: Formatted neurological consultation summary with observations and recommendations ready for printing or PDF export.

---

## 4. Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | HTML5, CSS3 (WCAG AAA Senior Theme, High-Contrast yellow/black), Vanilla ES6 Modules, Chart.js, Web Audio API, Web Speech API |
| **Backend** | Python 3.14, FastAPI, Uvicorn, Pydantic, WebSockets |
| **Database** | SQLite, SQLAlchemy ORM |
| **Computer Vision** | OpenCV (`opencv-python`), MediaPipe FaceMesh (468 landmarks), NumPy |
| **Generative AI** | Google GenAI SDK (`google-genai`), Gemini 2.5 Flash Multimodal Vision RAG |
| **Testing** | Pytest, Starlette TestClient (100% automated test pass rate) |

---

## 5. Installation & Setup Guide

### Step 1: Clone or Navigate to Directory
```bash
git clone https://github.com/aaravrajput6567-sys/CognitiveAssist.git
cd CognitiveAssist
```

### Step 2: Install Python Dependencies
```bash
python -m pip install -r requirements.txt
```

### Step 3: Run the Application
```bash
python run.py
```
The application will automatically:
1. Initialize the SQLite database (`data/cognitive_assist.db`).
2. Pre-seed a realistic senior profile (Eleanor Vance, 76), 12 historical sessions, 3 family memories, and clinical alerts.
3. Start the FastAPI server on **`http://localhost:8000`**.

Open your browser and navigate to:
- **Senior Portal**: `http://localhost:8000`
- **Caregiver Dashboard**: Click the *"📊 Caregiver & Doctor Portal"* tab at the top.
- **Interactive Swagger API Docs**: `http://localhost:8000/docs`

---

## 6. Standalone OpenCV Video Demo
To demonstrate the Computer Vision fatigue tracking pipeline in a native OpenCV window:
```bash
python cv_standalone/fatigue_detector.py
```
*Press `q` in the video window to quit.*

---

## 7. Running Automated Test Suite
To verify the full suite of unit and integration tests:
```bash
python -m pytest tests/ -v
```

