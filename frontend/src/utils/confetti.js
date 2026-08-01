// Tiny, dependency-free confetti burst. Spawns a handful of absolutely
// positioned divs at the given viewport coordinates, animates them falling
// and spinning via CSS, then cleans up after itself.

const COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#2dd4bf']

export function fireConfetti(x, y, count = 18) {
  if (typeof window === 'undefined') return
  // Respect reduced-motion preferences
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.top = '0'
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.pointerEvents = 'none'
  container.style.zIndex = '9999'
  document.body.appendChild(container)

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span')
    const size = 5 + Math.random() * 4
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const drift = (Math.random() - 0.5) * 160
    const fall = 120 + Math.random() * 140
    const spin = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360)
    const duration = 0.7 + Math.random() * 0.5
    const delay = Math.random() * 0.08

    piece.style.position = 'absolute'
    piece.style.left = `${x}px`
    piece.style.top = `${y}px`
    piece.style.width = `${size}px`
    piece.style.height = `${size * (Math.random() > 0.5 ? 1 : 1.8)}px`
    piece.style.background = color
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '1px'
    piece.style.setProperty('--drift', `${drift}px`)
    piece.style.setProperty('--fall', `${fall}px`)
    piece.style.setProperty('--spin', `${spin}deg`)
    piece.style.animation = `confetti-fall ${duration}s ease-out ${delay}s forwards`
    container.appendChild(piece)
  }

  setTimeout(() => container.remove(), 1200)
}