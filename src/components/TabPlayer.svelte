<script>
  import { onMount, onDestroy } from 'svelte';

  // src: URL to a Guitar Pro file (.gp/.gp3/.gp4/.gp5/.gpx), uploaded via
  // file-host like any other asset. tex: inline alphaTex source, for
  // hand-writing tab directly in a post without a GP file at all. Exactly
  // one of the two is expected.
  let { src, tex } = $props();

  let container = $state();
  let api = null;
  let ready = $state(false);
  let playing = $state(false);
  let error = $state('');

  function readVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  onMount(async () => {
    const { AlphaTabApi } = await import('@coderline/alphatab');

    api = new AlphaTabApi(container, {
      core: {
        file: src || undefined,
        // The vite plugin's auto-detection assumes assets sit next to the
        // JS chunk it's bundled into, which is true for a plain Vite app
        // but not Astro — Astro's chunks land under /_astro/, while
        // public/ assets (where the plugin copies these) stay at the site
        // root. Setting the paths explicitly sidesteps that mismatch.
        fontDirectory: '/font/',
      },
      player: {
        enablePlayer: true,
        scrollElement: container,
        soundFont: '/soundfont/sonivox.sf3',
      },
      display: {
        // Matches whichever theme is active at mount time — read once
        // rather than kept reactive, since the theme rarely changes
        // mid-read and re-rendering the whole score on toggle isn't
        // worth the complexity for v1.
        resources: {
          staffLineColor: readVar('--border', '#666666'),
          barSeparatorColor: readVar('--border', '#666666'),
          mainGlyphColor: readVar('--foreground', '#000000'),
          secondaryGlyphColor: readVar('--muted-foreground', '#888888'),
          scoreInfoColor: readVar('--foreground', '#000000'),
        },
      },
    });

    api.error.on((e) => {
      error = String(e?.message || e || 'failed to load');
    });
    api.playerReady.on(() => {
      ready = true;
    });
    api.playerStateChanged.on((e) => {
      playing = e.state === 1;
    });

    if (tex) {
      api.tex(tex);
    }
  });

  onDestroy(() => {
    api?.destroy();
  });

  function togglePlay() {
    api?.playPause();
  }
  function stop() {
    api?.stop();
  }
</script>

<div class="tabplayer">
  <div class="tabplayer-controls">
    <button type="button" onclick={togglePlay} disabled={!ready}>{playing ? 'pause' : 'play'}</button>
    <button type="button" onclick={stop} disabled={!ready}>stop</button>
    {#if !ready && !error}<span class="tabplayer-status">loading player…</span>{/if}
    {#if error}<span class="tabplayer-status tabplayer-error">{error}</span>{/if}
  </div>
  <div bind:this={container} class="tabplayer-surface"></div>
</div>

<style>
  .tabplayer {
    border: 1px solid var(--border);
    background: var(--card);
  }
  .tabplayer-controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.7rem;
    border-bottom: 1px solid var(--border);
  }
  .tabplayer-controls button {
    padding: 0.4em 0.9em;
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--secondary-foreground);
    cursor: pointer;
    font: inherit;
    font-size: 0.9rem;
  }
  .tabplayer-controls button:hover:not(:disabled) {
    border-color: var(--primary);
  }
  .tabplayer-controls button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .tabplayer-status {
    font-size: 0.8rem;
    color: var(--muted-foreground);
  }
  .tabplayer-error {
    color: var(--destructive);
  }
  .tabplayer-surface {
    overflow-x: auto;
    padding: 1rem;
    background: var(--background);
  }
</style>
