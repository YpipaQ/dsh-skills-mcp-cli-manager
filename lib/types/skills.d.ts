/**
 * Skills filesystem engine — scans the four manageable skill roots, parses
 * SKILL.md frontmatter, and performs enable/disable (frontmatter rewrite),
 * delete, scan-for-import, and import. Runs in the Host process with direct
 * node:fs access (a real npm package no longer needs the shell+node hack the
 * dynamic plugin used).
 * @module
 */
import type { ImportItem, ImportResult, ScannedSkill, SkillDetail, SkillSource, SkillSummary } from './protocol.ts';
/** User-level skill roots (project roots are derived from the workspace cwd). */
export interface SkillRoots {
    home: string;
    dshHome: string;
    agentsHome: string;
    userSkillsDir: string;
    agentsSkillsDir: string;
}
/** Resolve (and materialize) the user-level skill roots. */
export declare function getRoots(): SkillRoots;
/** Walk up from cwd to the nearest .git directory (the project root). */
export declare function findProjectRoot(cwd?: string): string;
export declare class SkillsManager {
    /** Scan one skill root directory into SkillSummary records. */
    scanRoot(dir: string, source: SkillSource): SkillSummary[];
    /** List skills across project and/or user roots, de-duplicated by path. */
    listSkills(cwd?: string): SkillSummary[];
    /** Read one skill document (body included). */
    readSkill(path: string): SkillDetail | null;
    /** Enable/disable a skill by rewriting its frontmatter invocation flags. */
    setSkillEnabled(path: string, enabled: boolean): void;
    /** Delete a skill (the whole bundle directory, or the flat .md file). */
    deleteSkill(path: string, kind: 'bundle' | 'file'): string;
    /** Scan an arbitrary directory for importable skills. */
    scanSkills(dir: string): ScannedSkill[];
    /** Import selected skills into ~/.dsh/skills (skip names that already exist). */
    importSkills(items: ImportItem[]): ImportResult[];
}
