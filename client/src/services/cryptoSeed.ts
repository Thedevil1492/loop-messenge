// 12-Word Cryptographic Seed Engine (Zero-PII Anonymous Identity)
// Uses native browser Web Crypto API (SubtleCrypto)

const WORDLIST = [
  'alpha', 'anchor', 'arrow', 'atom', 'aurora', 'beacon', 'breeze', 'bridge', 'canyon', 'castle',
  'cedar', 'cliff', 'cloud', 'comet', 'copper', 'coral', 'cosmos', 'crater', 'crystal', 'current',
  'dawn', 'delta', 'desert', 'diamond', 'dune', 'eagle', 'echo', 'ember', 'falcon', 'feather',
  'flame', 'forest', 'fossil', 'galaxy', 'glacier', 'granite', 'grove', 'harbor', 'haven', 'hawk',
  'horizon', 'island', 'jasper', 'jungle', 'lagoon', 'laser', 'lava', 'leaf', 'legacy', 'light',
  'lotus', 'lunar', 'magnet', 'mantle', 'meadow', 'meteor', 'mineral', 'mirror', 'mist', 'moon',
  'moss', 'mountain', 'nebula', 'nexus', 'oasis', 'ocean', 'olive', 'onyx', 'orbit', 'orchid',
  'origin', 'peak', 'pearl', 'phantom', 'pillar', 'pine', 'planet', 'plasma', 'polar', 'prism',
  'pulse', 'quartz', 'radar', 'radiant', 'rainbow', 'raven', 'reef', 'ridge', 'river', 'rocket',
  'sable', 'safari', 'sage', 'saturn', 'shadow', 'shield', 'sierra', 'silver', 'solar', 'spark',
  'sphere', 'spiral', 'spring', 'star', 'stellar', 'stone', 'summit', 'sun', 'surge', 'timber',
  'titan', 'topaz', 'torch', 'trail', 'valley', 'vapor', 'vector', 'velvet', 'vortex', 'wave',
  'willow', 'wind', 'zenith', 'zero', 'zinc', 'zodiac', 'amber', 'blade', 'blaze', 'boulder',
  'cascade', 'cipher', 'clover', 'cobalt', 'cortex', 'cosmic', 'crest', 'crown', 'drift', 'element',
  'emerald', 'enigma', 'flint', 'frost', 'garnet', 'geyser', 'glade', 'glyph', 'haven', 'helix',
  'hollow', 'iceberg', 'infinity', 'iron', 'isle', 'jade', 'kelp', 'lantern', 'matrix', 'mirage',
  'monarch', 'moonlight', 'mystic', 'north', 'nova', 'oasis', 'obsidian', 'opal', 'passage', 'portal',
  'quantum', 'radiance', 'relic', 'resonance', 'ripple', 'ruby', 'sanctuary', 'sapphire', 'sentinel', 'serene',
  'shimmer', 'solace', 'spectrum', 'summit', 'talisman', 'tempest', 'tide', 'trident', 'tundra', 'valiant',
  'vertex', 'vessel', 'vista', 'voyage', 'whisper', 'zenith', 'zephyr'
];

/**
 * Generates a random 12-word recovery mnemonic using cryptographically secure random values.
 */
export function generateSeedPhrase(): string[] {
  const words: string[] = [];
  const array = new Uint32Array(12);
  crypto.getRandomValues(array);

  for (let i = 0; i < 12; i++) {
    const index = array[i] % WORDLIST.length;
    words.push(WORDLIST[index]);
  }

  return words;
}

/**
 * Deterministically computes the SHA-256 hex hash of a normalized 12-word seed phrase.
 * This hash acts as the zero-knowledge identity credential.
 */
export async function hashSeedPhrase(seedPhrase: string | string[]): Promise<string> {
  const normalized = Array.isArray(seedPhrase)
    ? seedPhrase.map((w) => w.trim().toLowerCase()).join(' ')
    : seedPhrase.trim().toLowerCase().replace(/\s+/g, ' ');

  const encoder = new TextEncoder();
  const data = encoder.encode(`loop:identity:v1:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives a catchy, human-readable Anonymous Tag from the user's name or seed hash.
 * e.g., "@shadow_falcon_42"
 */
export function deriveDefaultAnonTag(displayName: string, seedHash: string): string {
  const clean = displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = clean || 'anon';
  const num = parseInt(seedHash.slice(0, 4), 16) % 900 + 100;
  return `@${prefix}_${num}`;
}
