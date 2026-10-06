import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import EventShell from './components/EventShell'
import ProtectedRoute from './components/ProtectedRoute'
import KioskLayout from './layouts/KioskLayout'
import ParticipantGoLayout from './layouts/ParticipantGoLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import SetPasswordPage from './pages/SetPasswordPage'
import AiSettingsPage from './pages/AiSettingsPage'
import ParticipantEditPage from './pages/ParticipantEditPage'
import ParticipantNewPage from './pages/ParticipantNewPage'
import RosterLivePage from './pages/RosterLivePage'
import RosterPage from './pages/RosterPage'
import SessionNewPage from './pages/SessionNewPage'
import SessionEditPage from './pages/SessionEditPage'
import SessionsPage from './pages/SessionsPage'
import BucksPage from './pages/BucksPage'
import CurriculumPage from './pages/CurriculumPage'
import CurriculumUnitNewPage from './pages/CurriculumUnitNewPage'
import CurriculumUnitEditPage from './pages/CurriculumUnitEditPage'
import RegistrationsPage from './pages/RegistrationsPage'
import ReportsPage from './pages/ReportsPage'
import MessagesPage from './pages/MessagesPage'
import BrandedLoading from './components/brand/BrandedStates'
import { isFeatureEnabled } from './lib/features'

function RouteLoading() {
  return <BrandedLoading />
}

function lazyRoute(
  importer: () => Promise<{ default: ComponentType }>,
) {
  const LazyPage = lazy(importer)

  return function LazyRoute() {
    return (
      <Suspense fallback={<RouteLoading />}>
        <LazyPage />
      </Suspense>
    )
  }
}

const CheckInPage = lazyRoute(() => import('./pages/CheckInPage'))
const CheckOutPage = lazyRoute(() => import('./pages/CheckOutPage'))
const LanyardsPage = lazyRoute(() => import('./pages/LanyardsPage'))
const LanyardReprintPage = lazyRoute(() => import('./pages/LanyardReprintPage'))
const ReadingPage = lazyRoute(() => import('./pages/ReadingPage'))
const KioskReadingPage = lazyRoute(() => import('./pages/kiosk/KioskReadingPage'))
const KioskQuizPage = lazyRoute(() => import('./pages/kiosk/KioskQuizPage'))
const GoScanPage = lazyRoute(() => import('./pages/go/GoScanPage'))
const GoQuizPage = lazyRoute(() => import('./pages/go/GoQuizPage'))
const GoProfilePage = lazyRoute(() => import('./pages/go/GoProfilePage'))
const DoorLoginPage = lazyRoute(() => import('./pages/DoorLoginPage'))
const DoorHelpersPage = lazyRoute(() => import('./pages/DoorHelpersPage'))
const FamilyPortalPage = lazyRoute(() => import('./pages/FamilyPortalPage'))
const FamilyLinksPage = lazyRoute(() => import('./pages/FamilyLinksPage'))
const FormsBulkPage = lazyRoute(() => import('./pages/FormsBulkPage'))

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/set-password" element={<SetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/door" element={<DoorLoginPage />} />
      <Route path="/door/" element={<DoorLoginPage />} />
      <Route element={<ParticipantGoLayout />}>
        <Route path="/go" element={<GoScanPage />} />
        <Route path="/go/profile" element={<GoProfilePage />} />
        <Route path="/go/quiz" element={<GoQuizPage />} />
        <Route path="/family" element={<FamilyPortalPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="/bucks" element={<BucksPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/new" element={<SessionNewPage />} />
          <Route path="/sessions/:id" element={<SessionEditPage />} />
          <Route path="/roster" element={<RosterPage />} />
          <Route path="/roster/new" element={<ParticipantNewPage />} />
          <Route path="/roster/forms" element={<FormsBulkPage />} />
          <Route path="/roster/:id" element={<ParticipantEditPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/family-links" element={<FamilyLinksPage />} />
          <Route path="/lanyards" element={<LanyardsPage />} />
          <Route path="/lanyards/reprint/:id" element={<LanyardReprintPage />} />
          <Route path="/volunteers" element={<Navigate to="/door-helpers" replace />} />
          <Route path="/volunteers/*" element={<Navigate to="/door-helpers" replace />} />
          <Route
            path="/volunteer-check-in"
            element={<Navigate to="/door-helpers" replace />}
          />
          <Route
            path="/volunteer-hours"
            element={<Navigate to="/door-helpers" replace />}
          />
          <Route path="/door-helpers" element={<DoorHelpersPage />} />
          <Route path="/curriculum" element={<CurriculumPage />} />
          <Route path="/curriculum/new" element={<CurriculumUnitNewPage />} />
          <Route path="/curriculum/:unitId" element={<CurriculumUnitEditPage />} />
          <Route
            path="/settings/ai"
            element={
              isFeatureEnabled('ai') ? (
                <AiSettingsPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Route>
        <Route element={<KioskLayout />}>
          <Route path="/kiosk/reading" element={<KioskReadingPage />} />
          <Route path="/kiosk/quiz" element={<Navigate to="/kiosk/reading" replace />} />
          <Route path="/kiosk/preview/reading" element={<KioskReadingPage />} />
          <Route path="/kiosk/preview/quiz" element={<KioskQuizPage />} />
        </Route>
        <Route element={<EventShell />}>
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/check-out" element={<CheckOutPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/roster-live" element={<RosterLivePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
