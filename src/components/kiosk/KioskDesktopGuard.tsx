import { Link } from 'react-router-dom'
import {
  btnPrimary,
  btnSecondary,
  headingSection,
  sectionCard,
  textSubtle,
} from '../../ui/classes'
import { kioskReadingPath } from '../../lib/kioskRoutes'

export default function KioskDesktopGuard() {
  return (
    <section className={`${sectionCard} space-y-6 text-center`}>
      <div className="space-y-3">
        <h2 className={headingSection}>Kiosk runs on participant tablets</h2>
        <p className={textSubtle}>
          Boys scan their lanyard badge on a locked iPad or tablet at the
          reading table. Laptops are for volunteers — log reading manually or
          preview what boys will see.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link to="/reading" className={btnPrimary}>
          Go to staff reading log
        </Link>
        <Link to={kioskReadingPath(true)} className={btnSecondary}>
          Preview boy kiosk (no camera)
        </Link>
      </div>

      <div className="rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-left text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Setting up a tablet</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Pick the session and refresh the roster while online.</li>
          <li>Open kiosk on the tablet, tap Lock, and set a staff PIN.</li>
          <li>Leave the tablet at the reading station for boys.</li>
        </ol>
      </div>
    </section>
  )
}
