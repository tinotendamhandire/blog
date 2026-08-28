export const CATEGORY_LABELS = {
  command_words: 'Command Words',
  text_types: 'Text Types',
  key_concept_terms: 'Key Concept Terms',
  hinge_words: 'Hinge Words',
};

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
