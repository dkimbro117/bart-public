import { Link } from 'react-router-dom'
import { btnSecondary, headingPage, sectionCard, textSubtle } from '../ui/classes'

type AdminAccessNoticeProps = {
  title: string
  /** What this person cannot do — shown in the lead sentence. */
  actionLabel?: string
  backTo?: string
  backLabel?: string
}

export default function AdminAccessNotice({
  title,
  actionLabel = 'manage this area',
  backTo = '/',
  backLabel = 'Back to home',
}: AdminAccessNoticeProps) {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className={headingPage}>{title}</h1>
        <p className={`mt-1 ${textSubtle}`}>
          Only admin accounts can {actionLabel}. Ask a program lead to grant
          admin access or to make changes for you.
        </p>
      </div>

      <div className={`${sectionCard} space-y-4`}>
        <p className="text-sm text-slate-700">
          If you believe you should have admin access, ask a program lead to set{' '}
          <strong>profiles.role</strong> to <strong>admin</strong> for your email
          in Supabase.
        </p>
        <Link to={backTo} className={btnSecondary}>
          {backLabel}
        </Link>
      </div>
    </section>
  )
}
