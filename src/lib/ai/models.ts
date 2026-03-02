// src/lib/ai/models.ts
// Single source of truth for AI model identifiers.
// Override via env vars when migrating to a new model version.

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
