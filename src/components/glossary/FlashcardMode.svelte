<script>
  import { shuffle } from '../../lib/glossary.js';

  let { pool } = $props();

  function keyOf(entry) {
    return `${entry.category}:${entry.term}`;
  }

  let deck = $state(pool.slice());
  let index = $state(0);
  let flipped = $state(false);
  let status = $state({}); // key -> 'know' | 'learning'

  let current = $derived(deck[index]);
  let counts = $derived.by(() => {
    let know = 0;
    let learning = 0;
    for (const v of Object.values(status)) {
      if (v === 'know') know += 1;
      else if (v === 'learning') learning += 1;
    }
    return { know, learning, unmarked: deck.length - know - learning };
  });

  function flip() {
    flipped = !flipped;
  }

  function next() {
    index = (index + 1) % deck.length;
    flipped = false;
  }

  function prev() {
    index = (index - 1 + deck.length) % deck.length;
    flipped = false;
  }

  function doShuffle() {
    deck = shuffle(deck);
    index = 0;
    flipped = false;
  }

  function mark(value) {
    status = { ...status, [keyOf(current)]: value };
    next();
  }

  function onKeydown(e) {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flip();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!--
  Styles for these classes live in src/styles/global.css (prefixed
  flashcard-*), not a scoped <style> block here. Astro only extracts CSS
  for whichever branch of GlossaryTool's mode toggle was present at
  SSR time — since quiz mode is the default, a scoped stylesheet on this
  component (the "else" branch, never server-rendered) was silently
  dropped from the entire build output: not inlined, not linked, not
  even embedded in the JS bundle for client-side injection. Confirmed by
  grepping the actual dist/ output. Global CSS always loads regardless of
  what's conditionally rendered, so it sidesteps the issue entirely.
-->
<div class="flashcard-root">
  <div class="flashcard-meta">
    <span>card {index + 1} of {deck.length}</span>
    <span>{counts.know} know it · {counts.learning} still learning</span>
  </div>

  <button type="button" class="flashcard-card" class:flipped onclick={flip} aria-label="flip card">
    <div class="flashcard-card-inner">
      <div class="flashcard-face flashcard-front">
        <span class="flashcard-label">term</span>
        <span class="flashcard-text">{current.term}</span>
      </div>
      <div class="flashcard-face flashcard-back">
        <span class="flashcard-label">definition</span>
        <span class="flashcard-text flashcard-def">{current.definition}</span>
      </div>
    </div>
  </button>
  <p class="flashcard-hint">tap card to flip · ← → to navigate</p>

  <div class="flashcard-nav-row">
    <button type="button" class="secondary" onclick={prev}>&larr; back</button>
    <button type="button" class="secondary" onclick={doShuffle}>shuffle</button>
    <button type="button" class="secondary" onclick={next}>forward &rarr;</button>
  </div>

  <div class="flashcard-mark-row">
    <button type="button" class="flashcard-mark learning" onclick={() => mark('learning')}>still learning</button>
    <button type="button" class="flashcard-mark know" onclick={() => mark('know')}>know it</button>
  </div>
</div>
