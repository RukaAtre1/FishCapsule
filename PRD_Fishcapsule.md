Product Requirements Document (PRD): FishCapsule
Version: 1.1 (Updated for Antigravity & Starfield UI) Status: Active Draft Target Audience: University Students, Self-learners, Job Seekers

1. Project Overview
FishCapsule is an AI-powered "Exam Accelerator" web application. It transforms unstructured learning materials (syllabuses, notes, slides) into a structured, executable learning pipeline geared towards passing exams efficiently. Core Philosophy: "Don't learn everything; learn what is tested." (80/20 Rule + Bloom's Taxonomy Alignment).

2. User Flow (The "Happy Path")
Onboarding: User lands on the "Starfield" homepage -> Clicks "Enter Capsule".

Ingestion: User creates a "Capsule" (Course) -> Uploads files (PDF, MD, TXT) or pastes text.

Calibration: User selects "Exam Mode" (e.g., Theory-Heavy vs. Code-Heavy).

Generation: System processes text -> Extracts Concepts -> Generates Cornell Cards with source references.

Learning: User reviews Cards (Cues/Notes/Summary).

Practice Ladder (The Loop):

User starts Quick Check (Recall).

User advances to Micro Drill (Application/Debug).

Verification Layer: AI evaluates answer -> Retrieves source text (RAG) -> Verifies accuracy against source -> Generates Feedback.

System provides Tactics (e.g., "You missed the edge case defined in Lecture 3").

Review: Dashboard shows "Mastery Radar" and "Battery Health" (Spaced Repetition).

3. Key Features & Functional Requirements
3.1 UI/UX & Visuals (Priority: High)
Theme: "Midnight Glass" (Dark mode, blurry transparencies, neon cyan/teal accents).

Hero Background: A physics-based interactive Starfield.

Tech: React Three Fiber (@react-three/fiber, @react-three/drei).

Behavior: Thousands of particles/stars that react to mouse movement (fluid repulsion/attraction force field).

Performance: Must run smoothly (60fps) without blocking the main thread.

Components: Glassmorphism cards (backdrop-blur), thin borders, glow effects on hover.

3.2 Data Ingestion & RAG Core
Input Support: Drag-and-drop PDF parsing (pdf.js), Markdown, Plain Text.

Chunking Strategy: Split content by logical headers ("Modules" or "Lectures").

Vector Store: Store embeddings to allow retrieval of "Source of Truth" during the verification phase.

3.3 The Knowledge Engine (Concepts)
Entity Extraction: AI must identify key terms (e.g., "Big O Notation", "Backpropagation").

Structure: Every Concept object must contain:

Definition: The core truth.

SourceSnippet: Reference to the original uploaded text (for evidence).

ExamProbability: High/Medium/Low (AI estimated based on keywords).

3.4 The Practice Ladder (Assessments)
Dynamic Generation: Questions are generated on-the-fly based on the Exam Mode.

Theory Mode: Multiple Choice, Short Answer.

Code Mode: "Fix this bug", "Complete this function", "Write the guard clause".

Verification Layer (The "Double-Check" Mechanism):

Step 1: User submits answer.

Step 2 (Hidden): System retrieves the specific chunk of text related to the question from the Vector Store.

Step 3 (Agentic): A secondary Prompt verifies the user's answer strictly against the retrieved chunk, not general knowledge.

Output: Feedback includes "Relevant Source: [Quote from notes]".

3.5 Feedback & Diagnosis System
Error Classification:

Syntax Error

Logic Gap

Memory Slip

Edge Case Missed

Tactics: Actionable advice linked to specific Concepts (e.g., "Go review the 'Signal vs Noise' card").

3.6 Dashboard & Visualization
Mastery Radar: A spider chart showing skills: [Recall, Syntax, Logic, Edge Cases].

Battery Health: Visual indicator for Spaced Repetition (Green = Fresh, Red = Review Now/Depleted).

4. Technical Stack
IDE/Agent: Google Antigravity (Agent-driven development).

Frontend Framework: Next.js 14+ (App Router).

Styling: Tailwind CSS + Framer Motion.

3D/Visuals: Three.js + React Three Fiber.

AI Model: Gemini 1.5 Pro / Flash (via Google AI Studio API) - selected for large context window capabilities.

Database: PostgreSQL (User data/Sessions).

Vector DB: Pinecone or Supabase pgvector (for RAG).

5. Deployment
Platform: Vercel (Frontend/API) or Google Cloud Run.

Environment: Production / Preview / Development branches.