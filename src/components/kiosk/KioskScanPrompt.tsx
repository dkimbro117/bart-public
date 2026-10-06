import ReadingBadge from '../brand/ReadingBadge'

type KioskScanPromptProps = {
  prompt?: string
}

export default function KioskScanPrompt({
  prompt = 'Scan your badge to log reading',
}: KioskScanPromptProps) {
  return <ReadingBadge variant="idle" idlePrompt={prompt} />
}
