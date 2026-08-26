<script>
  import { onMount } from 'svelte';

  let aesthetic = $state('cool');
  let brightness = $state('dark');
  let phosphor = $state('green');
  let ready = $state(false);

  onMount(() => {
    const html = document.documentElement;
    aesthetic = html.getAttribute('data-aesthetic') || 'cool';
    brightness = html.getAttribute('data-brightness') || 'dark';
    phosphor = html.getAttribute('data-phosphor') || 'green';
    ready = true;
  });

  function apply() {
    const html = document.documentElement;
    html.setAttribute('data-aesthetic', aesthetic);
    html.setAttribute('data-brightness', brightness);
    html.setAttribute('data-phosphor', phosphor);
    try {
      localStorage.setItem('aesthetic', aesthetic);
      localStorage.setItem('brightness', brightness);
      localStorage.setItem('phosphor', phosphor);
    } catch (e) {}
  }

  function setAesthetic(v) {
    aesthetic = v;
    apply();
  }
  function setBrightness(v) {
    brightness = v;
    apply();
  }
  function setPhosphor(v) {
    phosphor = v;
    apply();
  }
</script>

{#if ready}
  <div class="theme-controls">
    <div class="segmented tc-pair">
      <button type="button" aria-pressed={aesthetic === 'cool'} onclick={() => setAesthetic('cool')}>cool</button>
      <button type="button" aria-pressed={aesthetic === 'readable'} onclick={() => setAesthetic('readable')}>read</button>
    </div>
    <div class="segmented tc-pair">
      <button type="button" aria-pressed={brightness === 'dark'} onclick={() => setBrightness('dark')}>dark</button>
      <button type="button" aria-pressed={brightness === 'light'} onclick={() => setBrightness('light')}>light</button>
    </div>
    {#if aesthetic === 'cool'}
      <div class="segmented tc-pair">
        <button type="button" aria-pressed={phosphor === 'green'} onclick={() => setPhosphor('green')}>green</button>
        <button type="button" aria-pressed={phosphor === 'amber'} onclick={() => setPhosphor('amber')}>amber</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .theme-controls {
    position: fixed;
    bottom: 0.75rem;
    right: 0.75rem;
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.8rem;
  }
  .tc-pair {
    grid-template-columns: 1fr 1fr;
  }
  .theme-controls button {
    padding: 0.3rem 0.5rem;
    background: var(--secondary);
    color: var(--secondary-foreground);
    border: 0;
    cursor: pointer;
    font: inherit;
    text-transform: lowercase;
  }
  .theme-controls button[aria-pressed='true'] {
    background: var(--primary);
    color: var(--primary-foreground);
  }
</style>
