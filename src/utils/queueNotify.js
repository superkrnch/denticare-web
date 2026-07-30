let audioContext = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

export function playQueueChime() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + start)
      gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration + 0.05)
    }

    playTone(880, 0, 0.15)
    playTone(1174.66, 0.18, 0.2)
  } catch {
    // Audio may be blocked until user interaction
  }
}

export async function notifyStaffPatientCalled({ queueNumber, patientName, dentistName }) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission !== 'granted') return

  const station = dentistName ? ` (${dentistName})` : ''
  new Notification('Patient called', {
    body: `Now serving #${queueNumber} — ${patientName}${station}`,
    tag: `queue-${queueNumber}`,
  })
}
