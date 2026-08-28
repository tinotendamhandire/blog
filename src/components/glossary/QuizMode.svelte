<script>
  import { shuffle } from '../../lib/glossary.js';

  let { pool } = $props();

  // Compare by business key, never by object reference: Svelte 5's $state
  // deep-reactivity wraps the same underlying object in different proxy
  // instances depending on the path it's reached through, so the same
  // glossary entry reachable both as `current.entry` and as an element of
  // `current.options` can fail a `===` check even though it's "the same
  // entry" — confirmed empirically (0/many options ever matched as
  // correct before this fix). term+category is unique across the dataset.
  function sameEntry(a, b) {
    return a.term === b.term && a.category === b.category;
  }

  function buildQuestions() {
    return shuffle(pool).map((entry) => {
      const direction = Math.random() < 0.5 ? 'term-to-def' : 'def-to-term';
      const sameCategory = pool.filter((e) => e.category === entry.category && e.term !== entry.term);
      const distractors = shuffle(sameCategory).slice(0, 3);
      const options = shuffle([entry, ...distractors]);
      return { entry, direction, options };
    });
  }

  let questions = $state(buildQuestions());
  let index = $state(0);
  let score = $state(0);
  let selected = $state(null);
  let answered = $state(false);
  let finished = $state(false);

  let current = $derived(questions[index]);
  let prompt = $derived(
    current.direction === 'term-to-def' ? current.entry.term : current.entry.definition,
  );

  function optionLabel(opt) {
    return current.direction === 'term-to-def' ? opt.definition : opt.term;
  }

  function choose(opt) {
    if (answered) return;
    selected = opt;
    answered = true;
    if (sameEntry(opt, current.entry)) score += 1;
  }

  function next() {
    if (index < questions.length - 1) {
      index += 1;
      selected = null;
      answered = false;
    } else {
      finished = true;
    }
  }

  function retry() {
    questions = buildQuestions();
    index = 0;
    score = 0;
    selected = null;
    answered = false;
    finished = false;
  }
</script>

{#if finished}
  <div class="quiz-summary">
    <h2>quiz complete</h2>
    <p class="score">{score} / {questions.length}</p>
    <p class="pct">{Math.round((score / questions.length) * 100)}%</p>
    <button type="button" onclick={retry}>retry</button>
  </div>
{:else}
  <div class="quiz">
    <div class="quiz-meta">
      <span>question {index + 1} of {questions.length}</span>
      <span>score: {score}</span>
    </div>

    <p class="prompt">{prompt}</p>

    <div class="options">
      {#each current.options as opt (opt.term + opt.category)}
        {@const isCorrect = sameEntry(opt, current.entry)}
        {@const isSelected = selected !== null && sameEntry(opt, selected)}
        <button
          type="button"
          class="option"
          class:correct={answered && isCorrect}
          class:incorrect={answered && isSelected && !isCorrect}
          disabled={answered}
          onclick={() => choose(opt)}
        >
          {optionLabel(opt)}
        </button>
      {/each}
    </div>

    {#if answered}
      <div class="feedback" class:good={sameEntry(selected, current.entry)} class:bad={!sameEntry(selected, current.entry)}>
        <p class="feedback-headline">
          {sameEntry(selected, current.entry) ? 'correct' : 'incorrect'}
        </p>
        <p class="feedback-def"><strong>{current.entry.term}</strong> — {current.entry.definition}</p>
      </div>
      <button type="button" class="next-btn" onclick={next}>
        {index < questions.length - 1 ? 'next' : 'see results'}
      </button>
    {/if}
  </div>
{/if}

<style>
  .quiz-meta {
    display: flex;
    justify-content: space-between;
    color: var(--muted-foreground);
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }
  .prompt {
    font-size: 1.2rem;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .option {
    text-align: left;
    padding: 0.8em 1em;
    background: var(--card);
    color: var(--card-foreground);
    border: 1px solid var(--border);
    cursor: pointer;
    font: inherit;
    font-size: 0.95rem;
    line-height: 1.4;
  }
  .option:hover:not(:disabled) {
    border-color: var(--primary);
  }
  .option:disabled {
    cursor: default;
  }
  .option.correct {
    border-color: var(--primary);
    background: color-mix(in oklch, var(--primary) 18%, var(--card));
  }
  .option.incorrect {
    border-color: var(--destructive);
    background: color-mix(in oklch, var(--destructive) 18%, var(--card));
  }

  .feedback {
    margin-top: 1.25rem;
    padding: 0.9em 1em;
    border: 1px solid var(--border);
    background: var(--muted);
  }
  .feedback-headline {
    margin: 0 0 0.4em;
    font-weight: 700;
    text-transform: lowercase;
  }
  .feedback.good .feedback-headline { color: var(--primary); }
  .feedback.bad .feedback-headline { color: var(--destructive); }
  .feedback-def {
    margin: 0;
    line-height: 1.5;
  }

  .next-btn {
    margin-top: 1rem;
    width: 100%;
    padding: 0.8em;
    background: var(--primary);
    color: var(--primary-foreground);
    border: 0;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }

  .quiz-summary {
    text-align: center;
    padding: 2rem 1rem;
    border: 1px solid var(--border);
  }
  .quiz-summary h2 { margin: 0 0 1rem; }
  .score { font-size: 2rem; margin: 0; font-weight: 700; }
  .pct { color: var(--muted-foreground); margin: 0.25rem 0 1.5rem; }
  .quiz-summary button {
    padding: 0.7em 2em;
    background: var(--primary);
    color: var(--primary-foreground);
    border: 0;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }
</style>
