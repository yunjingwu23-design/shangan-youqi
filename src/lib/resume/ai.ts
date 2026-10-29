import type { Resume } from "./model";
// Future server adapter contract. No provider or network request is configured.
export type ResumeOptimizationRequest = {
  resume: Resume;
  targetJD?: string;
  explicitConsent: boolean;
};
export type ResumeSuggestion = {
  sectionId: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  needsUserConfirmation: true;
};
export type ResumeOptimizationResult = {
  suggestions: ResumeSuggestion[];
  missingEvidence: string[];
  providerLabel: "AI 辅助建议";
};
export interface ResumeAIAdapter {
  optimize(
    request: ResumeOptimizationRequest,
  ): Promise<ResumeOptimizationResult>;
}
