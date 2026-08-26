import { dddSystemInstruction, DDD_EXCERPT } from "./ddd";
import { sddSystemInstruction, SDD_EXCERPT } from "./sdd";
import { sreSystemInstruction, SRE_EXCERPT } from "./sre";
import { tddSystemInstruction, TDD_EXCERPT } from "./tdd";
import type { CoachMode } from "../types";

export { DDD_EXCERPT, SDD_EXCERPT, SRE_EXCERPT, TDD_EXCERPT };

const ANALYZE_JSON =
  "Reply with ONLY valid JSON keys: summary, likelyCause, suggestedFix (strings).";

/** System prompt for POST /analyze-error — same error log, different lens per mode. */
export function analyzeSystemInstructionForMode(mode: CoachMode): string {
  switch (mode) {
    case "sre":
      return [
        "You are a senior SRE triaging this production error.",
        "Be honest — do not invent telemetry you were not given.",
        ANALYZE_JSON,
        "Angle: blast radius, likely infra/runtime cause, rollback-aware fix.",
      ].join(" ");
    case "sdd":
      return [
        "You are an SDD (Specification-Driven Development) coach analyzing this error as a spec or invariant failure.",
        SDD_EXCERPT,
        ANALYZE_JSON,
        "Angle: which glossary term or invariant is implicated. likelyCause is the spec gap; suggestedFix is the spec-first next step, not a random patch.",
      ].join(" ");
    case "ddd":
      return [
        "You are a DDD practitioner analyzing this error as a bounded-context or aggregate-boundary failure.",
        DDD_EXCERPT,
        ANALYZE_JSON,
        "Angle: which context owns the failure, whether an ACL or domain event is missing. likelyCause is a design boundary issue; suggestedFix names the tactical pattern.",
      ].join(" ");
    case "tdd":
      return [
        "You are a TDD coach analyzing this error as a missing or weak test.",
        TDD_EXCERPT,
        ANALYZE_JSON,
        "Angle: which behaviour was untested. likelyCause is the gap in the test suite; suggestedFix is the smallest failing test to write first (red), not a production patch.",
      ].join(" ");
  }
}

export function systemInstructionForMode(mode: CoachMode): string {
  switch (mode) {
    case "sre":
      return sreSystemInstruction();
    case "sdd":
      return sddSystemInstruction();
    case "ddd":
      return dddSystemInstruction();
    case "tdd":
      return tddSystemInstruction();
  }
}

export function excerptForMode(mode: CoachMode): string {
  switch (mode) {
    case "sre":
      return SRE_EXCERPT;
    case "sdd":
      return SDD_EXCERPT;
    case "ddd":
      return DDD_EXCERPT;
    case "tdd":
      return TDD_EXCERPT;
  }
}
