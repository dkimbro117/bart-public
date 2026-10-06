type AudioContextCtor = typeof AudioContext

let context: AudioContext | null = null

function resolveCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null
  }
  const legacy = (window as unknown as { webkitAudioContext?: AudioContextCtor })
    .webkitAudioContext
  return window.AudioContext ?? legacy ?? null
}

function getContext(): AudioContext | null {
  const Ctor = resolveCtor()
  if (!Ctor) {
    return null
  }
  if (!context) {
    try {
      context = new Ctor()
    } catch {
      return null
    }
  }
  return context
}

/**
 * iOS starts every AudioContext suspended and only lets it resume inside a
 * real user gesture, so call this from a tap well before you need a sound.
 */
export function primeSound(): void {
  const ctx = getContext()
  if (ctx?.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }
}

/** Two quiet rising notes. Celebration for a boy finishing his quiz. */
export function playSuccessChime(): void {
  const ctx = getContext()
  if (!ctx) {
    return
  }

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {})
  }

  try {
    const start = ctx.currentTime
    for (const { frequency, offset } of [
      { frequency: 523.25, offset: 0 },
      { frequency: 783.99, offset: 0.12 },
    ]) {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.1, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.25)
    }
  } catch {
    // Audio is decoration; never let it break the completion screen.
  }
}
