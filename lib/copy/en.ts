export const copy = {
  common: {
    back: "Back",
    backToHome: "Back to Home",
    backToConcepts: "Back to Concepts",
    brand: "FishCapsule",
    learn: "Learn",
    practice: "Practice",
    feedback: "Feedback",
    session: "Session",
    attempts: "Attempts",
    needFix: "Need Fix",
    regenerate: "Regenerate",
    loading: "Loading...",
    notFound: "Not found in this browser.",
    startPractice: "Start Practice",
    viewFeedback: "View Feedback"
  },
  theme: {
    midnight: "Midnight",
    dark: "Dark",
    light: "Light"
  },
  toast: {
    saved: "Saved",
    microDrillDone: "Micro-drill complete. Retest unlocked.",
    aria: "Notification"
  },
  home: {
    title: "AI Self-Study Capsule",
    subtitle:
      "Paste your syllabus or notes, generate concepts, then drill with Cornell cards and quick checks. All data stays in your browser.",
    courseLabel: "Course Title (optional)",
    coursePlaceholder: "e.g., Introduction to Data Analytics",
    contextLabel: "Syllabus / Notes",
    contextPlaceholder: "Paste headings, bullets, and key points here...",
    missingContext: "Please paste a syllabus or notes first.",
    generate: "Generate Concepts",
    generating: "Generating...",
    loadSample: "Load Sample",
    clear: "Clear",
    howItWorks: "How it works",
    steps: ["Learn", "Practice", "Fix"],
    stepDetails: [
      "Generate Cornell-style concepts from your syllabus.",
      "Run quick checks with hints, answers, and practice ladders.",
      "Get targeted tactics, micro drills, and retest plans."
    ],
    trust: ["Private: stored in your browser", "Fast: local-first routing", "No signup or auth required"],
    heroCta: "Start learning",
    heroSubCta: "Or load sample"
  },
  learn: {
    headingFallback: "Study Concepts",
    subheading: "Choose a concept to open a Cornell card.",
    filters: {
      all: "All",
      dueToday: "Due today",
      dueSoon: "Due soon",
      needPractice: "Need practice",
      needFix: "Need fix"
    },
    cardActions: {
      startReview: "Start review",
      practice: "Practice",
      learn: "Learn",
      feedback: "Feedback"
    },
    emptySession: "Missing session id. Go back to start.",
    noSession: "Session not found in this browser.",
    moduleFallback: "Other Concepts",
    moduleLabel: "Module",
    description: "Pick a concept to review or practice."
  },
  concept: {
    sourceLabel: "Source:",
    sourceLLM: "LLM",
    sourceFallback: "Fallback",
    breadcrumbs: {
      concepts: "Concepts"
    },
    cardBasicsTitle: "Cornell card basics",
    cardBasicsIntro:
      "Read the cues, notes, and summary, then use Practice for quick checks and micro drills.",
    cardBasicsSteps: [
      "Skim the cues first, then expand notes as needed.",
      "Write your own key sentences, then compare against the pitfalls.",
      "When ready, enter Practice to run a quick check and micro task."
    ],
    missingParams: "Missing session or concept. Go back to start.",
    notFound: "Concept or session not found in this browser.",
    attemptsLabel: "Saved attempts:",
    regenerate: "Regenerate card",
    regenerating: "Regenerating...",
    generateError: "Failed to generate card.",
    startPractice: "Start Practice",
    viewFeedback: "View Feedback",
    generatingCard: "Generating card...",
    noCard: "No card yet."
  },
  learnCard: {
    cues: "Cues",
    summary: "Summary",
    notes: "Notes",
    pitfalls: "Common pitfalls",
    pitfallLabel: "Pitfall:",
    correctionLabel: "Correction:"
  },
  practice: {
    missingParams: "Missing session or concept. Please go back.",
    backHome: "Return Home",
    breadcrumbConcepts: "Concepts",
    placeholderConcept: "Concept",
    scheduledReview: "Scheduled Review - this round uses a shorter quick check",
    loading: "Loading practice...",
    sessionMissing: "Session not found. Please return and start again.",
    loadError: "Unable to load practice card. Please try again.",
    timeout: "Request timed out. Please try again.",
    practiceTitle: "Practice",
    ladderLabel: "Practice ladder:",
    attemptsLabel: "Attempts",
    dueLabel: "Due status",
    variantLadder: {
      fix_bug: "Fix bug",
      write_guard: "Write guard",
      edge_case: "Edge case"
    }
  },
  practiceTabs: {
    mcq: "Multiple choice",
    code: "Coding",
    short: "Short answer",
    answerPlaceholder: "Write your answer or reasoning...",
    hintsTitle: "Hints",
    answerTitle: "Reference answer",
    noQuestions: "No questions available."
  },
  stickyAction: {
    confidencePlaceholder: "Confidence (1-5)",
    options: {
      "5": "5 - Very confident",
      "4": "4 - Fairly confident",
      "3": "3 - Neutral",
      "2": "2 - Low",
      "1": "1 - Unsure"
    },
    showHints: "Show hints",
    revealAnswer: "Reveal answer",
    save: "Save attempt",
    saving: "Saving..."
  },
  hintsPanel: {
    title: "Hints / Key notes",
    collapse: "Collapse",
    expand: "Expand",
    preview: "Hints available",
    pitfalls: "Common pitfalls",
    pitfallLabel: "Pitfall:",
    correctionLabel: "Correction:"
  },
  microDrill: {
    promptLabel: "Try it:",
    hintShow: "Need a hint?",
    hintHide: "Hide hint",
    placeholder: "Type your attempt...",
    answered: "Answer viewed",
    showAnswer: "Show answer",
    completed: "Completed",
    markComplete: "Mark complete",
    referenceAnswer: "Reference answer",
    charCount: (len: number) => `Entered ${len} characters`
  },
  feedback: {
    titlePrefix: "Feedback Analysis -",
    attemptsNote:
      "Attempts recorded: {count}. Diagnosis uses your latest answer and is for learning only.",
    noAttemptsTitle: "No attempts yet",
    noAttemptsBody: "Complete a quick check first, then come back for feedback.",
    goPractice: "Go to practice",
    loading: "Analyzing...",
    diagnosisTitle: "Diagnosis",
    tacticsTitle: "Action tactics",
    microDrillTitle: "Micro drill",
    retestTitle: "Retest plan",
    retestReady: "Retest now",
    retestLocked: "Complete micro drill before retesting",
    missingParams: "Missing session or concept parameters.",
    backToConcept: "Back to concept",
    loadingFeedback: "Loading feedback...",
    error: "Failed to analyze. Please try again."
  },
  typeIn: {
    skip: "Skip animation"
  }
};
