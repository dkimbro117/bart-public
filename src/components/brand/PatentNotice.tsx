export const PATENT_NOTICE = 'Designed by David Kimbro. Patent pending.'

type PatentNoticeProps = {
  className?: string
}

export default function PatentNotice({ className = '' }: PatentNoticeProps) {
  return (
    <p className={`text-center text-xs text-slate-500 ${className}`.trim()}>
      {PATENT_NOTICE}
    </p>
  )
}
