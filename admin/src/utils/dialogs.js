const dialogs = []
let previousOverflow = ''
let previousInert = false
export function registerDialog(id) {
  if (dialogs.includes(id)) return
  if (!dialogs.length) {
    previousOverflow = document.body.style.overflow
    previousInert = document.getElementById('app')?.inert || false
    document.body.style.overflow = 'hidden'
    const app = document.getElementById('app'); if (app) app.inert = true
  }
  dialogs.push(id)
}
export function unregisterDialog(id) {
  const index = dialogs.indexOf(id)
  if (index < 0) return
  dialogs.splice(index, 1)
  if (!dialogs.length) {
    document.body.style.overflow = previousOverflow
    const app = document.getElementById('app'); if (app) app.inert = previousInert
  }
}
export function isTopDialog(id) { return dialogs.at(-1) === id }
