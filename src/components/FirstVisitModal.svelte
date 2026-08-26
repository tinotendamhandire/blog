<script>
  import { onMount } from 'svelte';

  let visible = $state(false);

  onMount(() => {
    try {
      if (!localStorage.getItem('aesthetic')) {
        visible = true;
      }
    } catch (e) {}
  });

  function choose(aesthetic) {
    try {
      const brightness =
        aesthetic === 'readable'
          ? window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : 'dark';
      localStorage.setItem('aesthetic', aesthetic);
      localStorage.setItem('brightness', brightness);
      if (!localStorage.getItem('phosphor')) {
        localStorage.setItem('phosphor', 'green');
      }
      document.documentElement.setAttribute('data-aesthetic', aesthetic);
      document.documentElement.setAttribute('data-brightness', brightness);
    } catch (e) {}
    visible = false;
  }
</script>

{#if visible}
  <div class="fv-overlay" role="dialog" aria-modal="true" aria-labelledby="fv-title">
    <div class="fv-box">
      <p id="fv-title" class="fv-title">How do you want this to look?</p>
      <div class="fv-actions">
        <button type="button" onclick={() => choose('cool')}>look good</button>
        <button type="button" onclick={() => choose('readable')}>read comfortably</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .fv-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in oklch, var(--background) 70%, black 30%);
    padding: 1rem;
  }
  .fv-box {
    background: var(--card);
    color: var(--card-foreground);
    border: 1px solid var(--border);
    padding: 1.5rem;
    max-width: 24rem;
    width: 100%;
    text-align: center;
  }
  .fv-title {
    margin: 0 0 1rem;
    font-size: 1.15rem;
  }
  .fv-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
  }
  .fv-actions button {
    padding: 0.6rem 0.5rem;
    background: var(--secondary);
    color: var(--secondary-foreground);
    border: 0;
    cursor: pointer;
    font: inherit;
  }
  .fv-actions button:hover,
  .fv-actions button:focus-visible {
    background: var(--primary);
    color: var(--primary-foreground);
    outline: none;
  }
</style>
