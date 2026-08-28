<script>
  import glossaryData from '../../data/glossary.json';
  import { CATEGORY_LABELS } from '../../lib/glossary.js';
  import QuizMode from './QuizMode.svelte';
  import FlashcardMode from './FlashcardMode.svelte';

  const allEntries = Object.entries(glossaryData).flatMap(([category, entries]) =>
    entries.map((e) => ({ ...e, category })),
  );
  const categoryIds = Object.keys(glossaryData);

  let mode = $state('quiz'); // 'quiz' | 'flashcards'
  let activeCategories = $state(new Set(categoryIds));

  let pool = $derived(allEntries.filter((e) => activeCategories.has(e.category)));
  // Remount the active mode's component whenever the filter or mode itself
  // changes — simplest way to reset all internal quiz/deck state cleanly.
  let resetKey = $derived(mode + ':' + categoryIds.filter((c) => activeCategories.has(c)).join(','));

  function toggleCategory(id) {
    const next = new Set(activeCategories);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id); // keep at least one category active
    } else {
      next.add(id);
    }
    activeCategories = next;
  }
</script>

<div class="glossary-tool">
  <div class="segmented mode-toggle">
    <button type="button" aria-pressed={mode === 'quiz'} onclick={() => (mode = 'quiz')}>
      quiz mode
    </button>
    <button type="button" aria-pressed={mode === 'flashcards'} onclick={() => (mode = 'flashcards')}>
      flashcard mode
    </button>
  </div>

  <fieldset class="category-filter">
    <legend>categories</legend>
    {#each categoryIds as id}
      <label class="category-pill" class:active={activeCategories.has(id)}>
        <input
          type="checkbox"
          checked={activeCategories.has(id)}
          onchange={() => toggleCategory(id)}
        />
        {CATEGORY_LABELS[id] ?? id}
      </label>
    {/each}
  </fieldset>

  {#if pool.length === 0}
    <p class="empty">Pick at least one category to begin.</p>
  {:else}
    {#key resetKey}
      {#if mode === 'quiz'}
        <QuizMode {pool} />
      {:else}
        <FlashcardMode {pool} />
      {/if}
    {/key}
  {/if}
</div>

<style>
  .glossary-tool {
    max-width: 40rem;
    margin: 0 auto;
  }
  .mode-toggle {
    grid-template-columns: 1fr 1fr;
    margin-bottom: 1.25rem;
  }
  .mode-toggle button {
    padding: 0.7em 1em;
    background: var(--secondary);
    color: var(--secondary-foreground);
    border: 0;
    cursor: pointer;
    font: inherit;
    font-size: 0.95rem;
  }
  .mode-toggle button[aria-pressed='true'] {
    background: var(--primary);
    color: var(--primary-foreground);
  }

  .category-filter {
    border: 1px solid var(--border);
    padding: 0.75rem;
    margin: 0 0 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .category-filter legend {
    padding: 0 0.4em;
    color: var(--muted-foreground);
    font-size: 0.85rem;
  }
  .category-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.4em 0.7em;
    border: 1px solid var(--border);
    cursor: pointer;
    font-size: 0.9rem;
    user-select: none;
  }
  .category-pill.active {
    background: var(--accent);
    color: var(--accent-foreground);
    border-color: var(--primary);
  }
  .category-pill input {
    accent-color: var(--primary);
  }

  .empty {
    color: var(--muted-foreground);
    text-align: center;
    padding: 2rem 1rem;
  }
</style>
