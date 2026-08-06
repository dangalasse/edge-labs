import { dddSystemInstruction, DDD_EXCERPT } from "./ddd";
import { sddSystemInstruction, SDD_EXCERPT } from "./sdd";
import { sreSystemInstruction, SRE_EXCERPT } from "./sre";
import { tddSystemInstruction, TDD_EXCERPT } from "./tdd";
import type { CoachMode } from "../types";

export { DDD_EXCERPT, SDD_EXCERPT, SRE_EXCERPT, TDD_EXCERPT };

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
