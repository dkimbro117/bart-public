import { Outlet } from 'react-router-dom'
import BartWordmark from '../components/brand/BartWordmark'
import PatentNotice from '../components/brand/PatentNotice'

export default function ParticipantGoLayout() {
  return (
    <div className="font-kiosk flex min-h-dvh flex-col bg-cream-50 text-slate-900">
      <header className="border-b border-cream-200 bg-cream-50 px-4 py-3 text-center">
        <div className="mx-auto flex max-w-lg justify-center">
          <BartWordmark size="sm" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
        <Outlet />
      </main>

      <footer className="px-4 py-4">
        <PatentNotice />
      </footer>
    </div>
  )
}
