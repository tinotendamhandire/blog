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

<div class="flashcards">
  <div class="fc-meta">
    <span>card {index + 1} of {deck.length}</span>
    <span>{counts.know} know it · {counts.learning} still learning</span>
  </div>

  <button type="button" class="card" class:flipped onclick={flip} aria-label="flip card">
    <div class="card-inner">
      <div class="card-face card-front">
        <span class="card-label">term</span>
        <span class="card-text">{current.term}</span>
      </div>
      <div class="card-face card-back">
        <span class="card-label">definition</span>
        <span class="card-text card-def">{current.definition}</span>
      </div>
    </div>
  </button>
  <p class="hint">tap card to flip · ← → to navigate</p>

  <div class="nav-row">
    <button type="button" class="secondary" onclick={prev}>&larr; back</button>
    <button type="button" class="secondary" onclick={doShuffle}>shuffle</button>
    <button type="button" class="secondary" onclick={next}>forward &rarr;</button>
  </div>

  <div class="mark-row">
    <button type="button" class="mark learning" onclick={() => mark('learning')}>still learning</button>
    <button type="button" class="mark know" onclick={() => mark('know')}>know it</button>
  </div>
</div>

<style>
  .fc-meta {
    display: flex;
    justify-content: space-between;
    color: var(--muted-foreground);
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .card {
    display: block;
    width: 100%;
    min-height: 14rem;
    padding: 0;
    border: 1px solid var(--border);
    background: var(--card);
    cursor: pointer;
    perspective: 1200px;
  }
  .card-inner {
    position: relative;
    width: 100%;
    height: 14rem;
    transition: transform 0.4s;
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
  }
  .card.flipped .card-inner {
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
  }
  .card-face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    text-align: center;
  }
  .card-back {
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
  }
  .card-label {
    font-size: 0.8rem;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .card-text {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--card-foreground);
  }
  .card-def {
    font-size: 1.05rem;
    font-weight: 400;
    line-height: 1.5;
  }

  .hint {
    text-align: center;
    color: var(--muted-foreground);
    font-size: 0.8rem;
    margin: 0.5rem 0 1.25rem;
  }

  .nav-row, .mark-row {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .nav-row button, .mark-row button {
    flex: 1;
    padding: 0.7em 0.5em;
    border: 1px solid var(--border);
    cursor: pointer;
    font: inherit;
    font-size: 0.9rem;
    background: var(--secondary);
    color: var(--secondary-foreground);
  }
  .mark.learning { border-color: var(--destructive); }
  .mark.know { border-color: var(--primary); }
  .mark.know:hover { background: color-mix(in oklch, var(--primary) 18%, var(--secondary)); }
  .mark.learning:hover { background: color-mix(in oklch, var(--destructive) 18%, var(--secondary)); }

  @media (prefers-reduced-motion: reduce) {
    .card-inner { transition: none; }
  }
</style>
