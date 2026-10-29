import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getChatbotQuestionsCount,
  getRandomQuestions,
  findBestMatchingQuestion,
  QUESTIONS
} from '../lib/chatbotService';

test('CHATBOT 1: Question Bank contains at least 5,000 unique predefined questions', () => {
  const count = getChatbotQuestionsCount();
  assert.ok(count >= 5000, `Expected at least 5000 questions, got ${count}`);
  assert.equal(QUESTIONS.length, count);

  // Check unique IDs
  const idSet = new Set(QUESTIONS.map(q => q.id));
  assert.equal(idSet.size, count, 'All question IDs must be unique');
});

test('CHATBOT 2: Every question adheres to the statutory schema with non-empty fields', () => {
  for (let i = 0; i < 50; i++) {
    const q = QUESTIONS[i];
    assert.ok(q.id && q.id.startsWith('Q-'), `Invalid ID format: ${q.id}`);
    assert.ok(q.category && q.category.length > 0, `Missing category in ${q.id}`);
    assert.ok(q.topic && q.topic.length > 0, `Missing topic in ${q.id}`);
    assert.ok(q.discipline && q.discipline.length > 0, `Missing discipline in ${q.id}`);
    assert.ok(q.query && q.query.length > 10, `Query too short in ${q.id}`);
    assert.ok(q.answer && q.answer.length > 20, `Answer too short in ${q.id}`);
    assert.ok(Array.isArray(q.references) && q.references.length > 0, `Missing references in ${q.id}`);
  }
});

test('CHATBOT 3: Question rotation changes questions after every cycle', () => {
  const initialBatch = getRandomQuestions(6);
  assert.equal(initialBatch.length, 6, 'Initial batch should contain 6 questions');

  const initialIds = initialBatch.map(q => q.id);

  // Rotate to new batch excluding initial IDs
  const secondBatch = getRandomQuestions(6, initialIds);
  assert.equal(secondBatch.length, 6, 'Second batch should contain 6 questions');

  for (const q of secondBatch) {
    assert.ok(!initialIds.includes(q.id), `Question ${q.id} was repeated in the next batch! Questions must change.`);
  }
});

test('CHATBOT 4: Search engine accurately retrieves answers for predefined queries', () => {
  const sample = QUESTIONS[10];
  const match = findBestMatchingQuestion(sample.query);

  assert.ok(match !== null, 'Should find matching question');
  assert.equal(match.question.id, sample.id, 'Should identify exact matching question');
  assert.ok(match.score > 0.8, 'Score should be high for exact query');
  assert.ok(match.question.answer.length > 20, 'Answer must be present');
});
