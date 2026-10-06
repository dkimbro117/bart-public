function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatInline(text: string): string {
  let result = escapeHtml(text)
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-crimson-700 underline">$1</a>',
  )
  return result
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''

    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.startsWith('## ')) {
      blocks.push(
        `<h2 class="mb-3 text-lg font-semibold text-slate-900">${formatInline(line.slice(3).trim())}</h2>`,
      )
      index += 1
      continue
    }

    if (line.startsWith('- ')) {
      const items: string[] = []
      while (index < lines.length && (lines[index] ?? '').startsWith('- ')) {
        items.push(
          `<li class="mb-2">${formatInline((lines[index] ?? '').slice(2).trim())}</li>`,
        )
        index += 1
      }
      blocks.push(`<ul class="mb-4 list-disc pl-5 text-slate-700">${items.join('')}</ul>`)
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const current = lines[index] ?? ''
      if (!current.trim() || current.startsWith('## ') || current.startsWith('- ')) {
        break
      }
      paragraphLines.push(current.trim())
      index += 1
    }

    blocks.push(
      `<p class="mb-4 text-base leading-relaxed text-slate-700">${formatInline(paragraphLines.join(' '))}</p>`,
    )
  }

  return blocks.join('\n')
}
