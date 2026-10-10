import type { AppData } from "@/types";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export interface AIProvider {
  name: string;
  answer(question: string, data: AppData): Promise<string> | string;
}

export const SUGGESTED_QUERIES = [
  "Which products are low in stock?",
  "Who owes money?",
  "What are my best-selling products?",
  "Which invoices are overdue?",
  "What appointments do I have today?",
  "Which tasks are overdue?",
  "How much revenue this month?",
  "Show unpaid invoices",
];
