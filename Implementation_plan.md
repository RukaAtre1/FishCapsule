FishCapsule Master Implementation Plan
Status Tracking:

[x] Phase 1: Foundation & UI (StarField, Landing Page) - COMPLETED

[ ] Phase 2: Data Ingestion (PDF Parsing, API) - CURRENT PRIORITY

[ ] Phase 3: Intelligence (Concept Extraction, Gemini AI)

[ ] Phase 4: The Loop (Practice & Feedback)

🚨 Phase 2: Data Ingestion (Detailed Steps)
Goal: Allow users to upload a PDF, parse it on the server, and see the extracted text.

Step 2.1: Backend API Implementation
File: app/api/parse/route.ts Action: Create or Overwrite with this exact robust logic to fix the 500 Internal Server Error.

TypeScript

import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}`);

    // Convert File to Buffer (Crucial Step)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF
    const data = await pdf(buffer);

    return NextResponse.json({
      success: true,
      text: data.text,
      info: data.info,
      pages: data.numpages
    });
  } catch (error: any) {
    console.error("PDF Parse Error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF", details: error.message },
      { status: 500 }
    );
  }
}
Step 2.2: Frontend Integration
File: app/ingestion/page.tsx Action:

State: Add const [parsedText, setParsedText] = useState("");

Upload Handler: Update the handleUpload function to:

POST the file to /api/parse.

If response.ok, set parsedText.

If parsedText exists, hide the Upload Dropzone and show a Preview Card.

Preview Card UI:

Glassmorphism container.

Title: "Knowledge Extracted".

Content: A scrollable text area showing the first 1000 characters of parsedText.

Button: "Generate Concepts" (leads to Phase 3).

🧠 Phase 3: The Knowledge Engine
Goal: Send the parsed text to Gemini AI to generate structured Cornell Notes.

Step 3.1: Setup Gemini AI
Install: npm install @google/generative-ai

Env: Ensure GOOGLE_API_KEY is set in .env.local.

Utility: Create lib/gemini.ts to initialize the model (gemini-1.5-pro).

Step 3.2: Concept Extraction API
File: app/api/generate/route.ts Action:

Accept text (string) from the request body.

Prompt Engineering:

"Analyze the following learning material. Extract key concepts. For each concept, provide: 1. A definition, 2. A specific quote from the text as evidence, 3. Exam probability (High/Med/Low). Return as JSON array."

Return the JSON structure.

⚔️ Phase 4: The Practice Ladder
Goal: Interactive study loop.

Step 4.1: Component Architecture
Create components/study/ConceptCard.tsx (The Cornell Card).

Create components/study/QuizInterface.tsx (The Practice/Micro Drill).

Step 4.2: Practice Logic
Quick Check: Simple Flip-card or Multiple Choice.

Micro Drill: A text input area where user types an answer.

AI Judge: Send user answer + Original Concept to Gemini to judge correctness.