import type { FlashcardCard } from "@/lib/flashcards";

const FLASHCARD_DRAFT_KEY = "studyhive:ai:flashcard-draft";
const NOTE_DRAFT_KEY = "studyhive:ai:note-draft";

export type FlashcardDraft = {
  name: string;
  description: string;
  cards: FlashcardCard[];
};

export type NoteDraft = {
  groupName: string;
  groupDescription: string;
  noteTitle: string;
  noteContent: string;
};

function safeSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export function saveFlashcardDraft(draft: FlashcardDraft) {
  safeSet(FLASHCARD_DRAFT_KEY, draft);
}

export function readFlashcardDraft() {
  return safeGet<FlashcardDraft>(FLASHCARD_DRAFT_KEY);
}

export function clearFlashcardDraft() {
  safeRemove(FLASHCARD_DRAFT_KEY);
}

export function saveNoteDraft(draft: NoteDraft) {
  safeSet(NOTE_DRAFT_KEY, draft);
}

export function readNoteDraft() {
  return safeGet<NoteDraft>(NOTE_DRAFT_KEY);
}

export function clearNoteDraft() {
  safeRemove(NOTE_DRAFT_KEY);
}
