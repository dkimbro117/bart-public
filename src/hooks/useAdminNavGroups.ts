import { useMemo } from 'react'
import {
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
  Bars3BottomLeftIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  EllipsisHorizontalIcon,
  HomeIcon,
  IdentificationIcon,
  PrinterIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { usePendingRegistrationCount } from '../hooks/usePendingRegistrationCount'
import { isFeatureEnabled } from '../lib/features'
import type { StaffNavGroup, StaffNavItem } from '../lib/staffNav'
import type { FloatingNavItem } from '../components/ui/FloatingNav'

export function buildAdminNavItems(onOpenMore: () => void): FloatingNavItem[] {
  return [
    {
      id: 'home',
      to: '/',
      label: 'Home',
      icon: HomeIcon,
      match: (path) => path === '/',
    },
    {
      id: 'boys',
      to: '/roster',
      label: 'Boys',
      icon: UsersIcon,
      match: (path) => path === '/roster' || path.startsWith('/roster/'),
    },
    {
      id: 'program',
      to: '/curriculum',
      label: 'Program',
      icon: AcademicCapIcon,
      match: (path) =>
        path.startsWith('/curriculum') || path.startsWith('/lanyards'),
    },
    {
      id: 'more',
      label: 'More',
      icon: EllipsisHorizontalIcon,
      onSelect: onOpenMore,
      match: (path) =>
        path.startsWith('/reports') ||
        path.startsWith('/messages') ||
        path.startsWith('/registrations') ||
        path.startsWith('/sessions') ||
        path.startsWith('/bucks') ||
        path.startsWith('/door-helpers') ||
        path.startsWith('/family-links') ||
        path.startsWith('/roster/forms') ||
        path.startsWith('/settings'),
    },
  ]
}

export function useAdminNavGroups(): StaffNavGroup[] {
  const { profile } = useAuth()
  const { count: pendingRegistrations } = usePendingRegistrationCount()
  const isAdmin = profile?.role === 'admin'

  return useMemo(() => {
    const eventDay: StaffNavItem[] = [
      {
        id: 'live',
        to: '/roster-live',
        label: 'Live roster',
        icon: ChartBarIcon,
        match: (path) => path === '/roster-live',
      },
      {
        id: 'check-in',
        to: '/check-in',
        label: 'Check in',
        icon: Bars3BottomLeftIcon,
        match: (path) => path === '/check-in',
        fieldRoute: true,
      },
      {
        id: 'check-out',
        to: '/check-out',
        label: 'Check out',
        icon: ArrowRightOnRectangleIcon,
        match: (path) => path === '/check-out',
        fieldRoute: true,
      },
      {
        id: 'reading',
        to: '/reading',
        label: 'Reading log',
        icon: BookOpenIcon,
        match: (path) => path === '/reading',
        fieldRoute: true,
      },
    ]

    const manage: StaffNavItem[] = [
      {
        id: 'home',
        to: '/',
        label: 'Home',
        icon: HomeIcon,
        match: (path) => path === '/',
      },
      {
        id: 'sessions',
        to: '/sessions',
        label: 'Sessions',
        icon: CalendarDaysIcon,
        match: (path) => path.startsWith('/sessions'),
      },
      {
        id: 'roster',
        to: '/roster',
        label: 'Boys roster',
        icon: UsersIcon,
        match: (path) => path === '/roster' || path.startsWith('/roster/'),
      },
      {
        id: 'forms-bulk',
        to: '/roster/forms',
        label: 'Mark forms',
        icon: ClipboardDocumentListIcon,
        match: (path) => path === '/roster/forms',
      },
      {
        id: 'registrations',
        to: '/registrations',
        label: 'Registrations',
        icon: ClipboardDocumentListIcon,
        match: (path) => path === '/registrations',
        badge: pendingRegistrations > 0 ? pendingRegistrations : undefined,
      },
      {
        id: 'door-helpers',
        to: '/door-helpers',
        label: 'BART Volunteers',
        icon: IdentificationIcon,
        match: (path) => path === '/door-helpers',
      },
      {
        id: 'curriculum',
        to: '/curriculum',
        label: 'Curriculum',
        icon: AcademicCapIcon,
        match: (path) => path.startsWith('/curriculum'),
      },
      {
        id: 'lanyards',
        to: '/lanyards',
        label: 'Lanyards',
        icon: PrinterIcon,
        match: (path) => path.startsWith('/lanyards'),
      },
    ]

    const groups: StaffNavGroup[] = [
      { id: 'event', label: 'Event day', items: eventDay },
      { id: 'manage', label: 'Manage', items: manage },
    ]

    const adminItems: StaffNavItem[] = [
      {
        id: 'reports',
        to: '/reports',
        label: 'Reports',
        icon: ChartBarIcon,
        match: (path) => path === '/reports',
      },
      {
        id: 'bucks',
        to: '/bucks',
        label: 'BART Bucks',
        icon: CurrencyDollarIcon,
        match: (path) => path === '/bucks',
      },
    ]

    if (isAdmin) {
      adminItems.push({
        id: 'messages',
        to: '/messages',
        label: 'Messages',
        icon: ChatBubbleLeftRightIcon,
        match: (path) => path === '/messages',
      })
      adminItems.push({
        id: 'family-links',
        to: '/family-links',
        label: 'Email family link',
        icon: UsersIcon,
        match: (path) => path === '/family-links',
      })
      if (isFeatureEnabled('ai')) {
        adminItems.push({
          id: 'ai-settings',
          to: '/settings/ai',
          label: 'AI automations',
          icon: Cog6ToothIcon,
          match: (path) => path.startsWith('/settings'),
        })
      }
    }

    groups.push({ id: 'insights', label: isAdmin ? 'Admin' : 'Insights', items: adminItems })

    return groups
  }, [isAdmin, pendingRegistrations])
}
