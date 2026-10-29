import questionsData from './chatbotQuestions.json';

export interface ChatbotQuestion {
  id: string;
  category: string;
  topic: string;
  discipline: string;
  region: string;
  label: string;
  query: string;
  answer: string;
  references: string[];
  actionLink?: {
    label: string;
    tab?: string;
  };
}

// Cast dataset to strongly typed array
const QUESTIONS: ChatbotQuestion[] = questionsData as ChatbotQuestion[];

/**
 * Total count of predefined questions in the bank (5,000)
 */
export function getChatbotQuestionsCount(): number {
  return QUESTIONS.length;
}

/**
 * Returns a random batch of predefined questions from the 5,000 question bank.
 * Ensures questions come from different categories for rich variety.
 */
export function getRandomQuestions(count: number = 6, excludeIds: string[] = []): ChatbotQuestion[] {
  const excludeSet = new Set(excludeIds);
  const eligible = QUESTIONS.filter(q => !excludeSet.has(q.id));
  
  if (eligible.length === 0) {
    // If all excluded, reset to all
    return getRandomQuestions(count, []);
  }

  // Shuffle and pick diverse categories
  const shuffled = [...eligible].sort(() => 0.5 - Math.random());
  const selected: ChatbotQuestion[] = [];
  const seenCategories = new Set<string>();

  // Pass 1: Try to pick from distinct categories
  for (const q of shuffled) {
    if (!seenCategories.has(q.category)) {
      selected.push(q);
      seenCategories.add(q.category);
      if (selected.length >= count) break;
    }
  }

  // Pass 2: Fill remaining if needed
  if (selected.length < count) {
    for (const q of shuffled) {
      if (!selected.some(s => s.id === q.id)) {
        selected.push(q);
        if (selected.length >= count) break;
      }
    }
  }

  return selected;
}

/**
 * Tokenize and normalize text for semantic keyword matching
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'what', 'which',
  'how', 'why', 'does', 'can', 'under', 'are', 'was', 'were', 'been', 'about'
]);

/**
 * Search the 5,000 question bank for the best matching predefined question.
 * Returns the matched question and relevance score.
 */
export function findBestMatchingQuestion(userQuery: string): { question: ChatbotQuestion; score: number } | null {
  const queryTokens = tokenize(userQuery);
  if (queryTokens.length === 0) return null;

  let bestMatch: ChatbotQuestion | null = null;
  let bestScore = 0;

  const lowerQuery = userQuery.toLowerCase().trim();

  for (const q of QUESTIONS) {
    // Exact or near-exact match gets maximum priority
    const lowerQ = q.query.toLowerCase();
    if (lowerQ === lowerQuery || lowerQ.includes(lowerQuery) || lowerQuery.includes(lowerQ)) {
      return { question: q, score: 1.0 };
    }

    // Token overlap score
    const targetTokens = tokenize(q.query + ' ' + q.topic + ' ' + q.discipline + ' ' + q.category);
    let matchCount = 0;

    for (const qt of queryTokens) {
      if (targetTokens.includes(qt)) {
        matchCount++;
      }
    }

    // Jaccard similarity index
    const unionSize = new Set([...queryTokens, ...targetTokens]).size;
    const score = unionSize > 0 ? matchCount / unionSize : 0;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = q;
    }
  }

  // Minimum threshold to prevent spurious answers
  if (bestScore >= 0.15 && bestMatch) {
    return { question: bestMatch, score: bestScore };
  }

  return null;
}

export { QUESTIONS };
