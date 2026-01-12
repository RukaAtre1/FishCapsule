# FishCapsule 🐟

AI-powered self-study platform with Cornell Notes methodology and spaced repetition.

## Features

- **Text Ingestion** - Paste syllabus/notes to extract key concepts
- **Cornell Cards** - AI-generated study cards with cues, notes, summary
- **Quick Checks** - MCQ and short-answer practice questions
- **Barrier Diagnosis** - Identifies learning gaps with targeted feedback
- **Spaced Repetition** - Review scheduling based on performance

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Add your ZAI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy on Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `ZAI_API_KEY` - Your API key
   - `GLM_MODEL` - Model name (default: glm-4.5-flash)
4. Deploy

## Architecture

```
┌─────────────┐
│  Landing    │
│  (StarField)│
└──────┬──────┘
       │
┌──────▼──────┐
│  /ingestion │ → POST /api/concepts
│  (text input)│
└──────┬──────┘
       │
┌──────▼──────┐
│   /learn    │ → SessionId in query
│  (concepts) │
└──────┬──────┘
       │
┌──────▼────────────┐
│ /learn/[conceptId]│ → POST /api/cornell
│  (Cornell card)   │
└──────┬────────────┘
       │
┌──────▼──────┐
│  /practice  │ → Quick checks
└──────┬──────┘
       │
┌──────▼──────┐
│  /feedback  │ → POST /api/feedback
└─────────────┘
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + CSS Variables
- **3D**: Three.js + React Three Fiber
- **Validation**: Zod
- **Storage**: localStorage

## Roadmap

### Phase 4: RAG (Planned)
- Chunk syllabus/notes into overlapping segments
- Generate embeddings via API
- Vector store for semantic search
- Retrieve top-K context for Cornell/Feedback generation

### Phase 5: Advanced Verification
- Multi-pass LLM judging for answer grading
- Confidence calibration
- Adaptive difficulty

## License

MIT
