/**
 * Client locale dictionaries for the dsh-skills-mcp-cli-manager settings card.
 * The card chrome is bilingual; the deeper management UI keeps the original
 * Chinese copy inline (see manager.tsx).
 */
/** Locale keys this plugin's card chrome uses. */
export type SkillsMcpKey = 'title' | 'description' | 'expand' | 'collapse' | 'notExposed' | 'readOnly' | 'unsaved' | 'discard' | 'save' | 'saving' | 'saveFailed' | 'inherit' | 'overridden' | 'reset' | 'invalid' | 'enabled' | 'enabledHint' | 'announce' | 'announceHint' | 'on' | 'off';
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: Record<SkillsMcpKey, string>;
/** English dictionary, checked complete against the zh key set. */
export declare const en: Record<SkillsMcpKey, string>;
