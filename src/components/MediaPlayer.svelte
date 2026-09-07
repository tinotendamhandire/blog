<script>
  let { src, kind } = $props();

  let el = $state();
  let playing = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let muted = $state(false);
  let seeking = $state(false);

  let progressPct = $derived(duration ? (currentTime / duration) * 100 : 0);

  function togglePlay() {
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  }

  function onTimeUpdate() {
    if (!seeking && el) currentTime = el.currentTime;
  }

  function onLoadedMetadata() {
    duration = el?.duration || 0;
  }

  function onSeekInput(e) {
    currentTime = Number(e.currentTarget.value);
  }

  function onSeekCommit(e) {
    if (el) el.currentTime = Number(e.currentTarget.value);
    seeking = false;
  }

  function toggleMute() {
    muted = !muted;
    if (el) el.muted = muted;
  }

  function toggleFullscreen() {
    el?.requestFullscreen?.();
  }

  function formatTime(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }
</script>

<div class="media-player" class:audio-only={kind === 'audio'}>
  {#if kind === 'video'}
    <video
      bind:this={el}
      {src}
      preload="metadata"
      onplay={() => (playing = true)}
      onpause={() => (playing = false)}
      ontimeupdate={onTimeUpdate}
      onloadedmetadata={onLoadedMetadata}
      onclick={togglePlay}
    ></video>
  {:else}
    <audio
      bind:this={el}
      {src}
      preload="metadata"
      onplay={() => (playing = true)}
      onpause={() => (playing = false)}
      ontimeupdate={onTimeUpdate}
      onloadedmetadata={onLoadedMetadata}
    ></audio>
  {/if}

  <div class="media-controls">
    <button type="button" class="media-btn media-play" onclick={togglePlay} aria-label={playing ? 'pause' : 'play'}>
      {#if playing}
        <svg viewBox="0 0 16 16" width="14" height="14"><rect x="3" y="2" width="3.5" height="12" fill="currentColor" /><rect x="9.5" y="2" width="3.5" height="12" fill="currentColor" /></svg>
      {:else}
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2 L14 8 L4 14 Z" fill="currentColor" /></svg>
      {/if}
    </button>

    <span class="media-time">{formatTime(currentTime)}</span>

    <input
      type="range"
      class="media-seek"
      min="0"
      max={duration || 0}
      step="0.01"
      value={currentTime}
      style={`--progress: ${progressPct}%`}
      oninput={onSeekInput}
      onchange={onSeekCommit}
      onpointerdown={() => (seeking = true)}
      aria-label="seek"
    />

    <span class="media-time">{formatTime(duration)}</span>

    <button type="button" class="media-btn media-mute" onclick={toggleMute} aria-label={muted ? 'unmute' : 'mute'}>
      {#if muted}
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M2 6 H5 L9 3 V13 L5 10 H2 Z" fill="currentColor" /><path d="M11 6 L14 9 M14 6 L11 9" stroke="currentColor" stroke-width="1.5" /></svg>
      {:else}
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M2 6 H5 L9 3 V13 L5 10 H2 Z" fill="currentColor" /><path d="M11.5 5.5 A4 4 0 0 1 11.5 10.5" stroke="currentColor" stroke-width="1.5" fill="none" /></svg>
      {/if}
    </button>

    {#if kind === 'video'}
      <button type="button" class="media-btn media-fullscreen" onclick={toggleFullscreen} aria-label="fullscreen">
        <svg viewBox="0 0 16 16" width="13" height="13"><path d="M2 6 V2 H6 M10 2 H14 V6 M14 10 V14 H10 M6 14 H2 V10" stroke="currentColor" stroke-width="1.5" fill="none" /></svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .media-player {
    border: 1px solid var(--border);
    background: var(--card);
  }
  video {
    display: block;
    width: 100%;
    max-height: 32rem;
    cursor: pointer;
    background: #000;
  }
  .audio-only {
    padding: 0;
  }

  .media-controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.7rem;
    border-top: 1px solid var(--border);
  }
  .audio-only .media-controls {
    border-top: none;
  }

  .media-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    padding: 0;
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--secondary-foreground);
    cursor: pointer;
  }
  .media-btn:hover {
    border-color: var(--primary);
  }

  .media-time {
    flex-shrink: 0;
    font-size: 0.8rem;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
    min-width: 2.4em;
    text-align: center;
  }

  .media-seek {
    flex: 1;
    appearance: none;
    -webkit-appearance: none;
    height: 4px;
    background: linear-gradient(
      to right,
      var(--primary) var(--progress),
      var(--border) var(--progress)
    );
    cursor: pointer;
  }
  .media-seek::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 0;
    background: var(--primary);
    border: 1px solid var(--card);
    cursor: pointer;
  }
  .media-seek::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 0;
    background: var(--primary);
    border: 1px solid var(--card);
    cursor: pointer;
  }
  .media-seek::-moz-range-track {
    height: 4px;
    background: transparent;
  }
</style>
