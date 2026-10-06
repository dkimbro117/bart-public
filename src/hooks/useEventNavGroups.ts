import { useMemo } from 'react'
import {
  ArrowRightOnRectangleIcon,
  Bars3BottomLeftIcon,
  BookOpenIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useKioskMode } from '../contexts/KioskModeContext'
import { isDoorHelper } from '../lib/auth'
import { useInputMode } from '../hooks/useInputMode'
import type { StaffNavGroup, StaffNavItem } from '../lib/staffNav'
import type { FloatingNavItem } from '../components/ui/FloatingNav'

/** Compact items for the mobile floating pill bar during an event. */
export function useEventNavItems(): FloatingNavItem[] {
  const { requestEnterKioskMode } = useKioskMode()
  const { isDesktopViewport } = useInputMode()
  const { profile } = useAuth()
  const doorOnly = isDoorHelper(profile)

  return useMemo(() => {
    const items: FloatingNavItem[] = [
      {
        id: 'boys',
        to: '/check-in',
        label: 'Boys',
        icon: Bars3BottomLeftIcon,
        match: (path) => path === '/check-in',
      },
    ]

    if (!doorOnly && !isDesktopViewport) {
      items.push({
        id: 'kiosk',
        label: 'Kiosk',
        icon: BookOpenIcon,
        match: (path) => path.startsWith('/kiosk'),
        onSelect: () => requestEnterKioskMode('/kiosk/reading'),
      })
    } else if (!doorOnly) {
      items.push({
        id: 'reading',
        to: '/reading',
        label: 'Reading',
        icon: BookOpenIcon,
        match: (path) => path === '/reading' || path.startsWith('/kiosk'),
      })
    }

    items.push(
      {
        id: 'checkout',
        to: '/check-out',
        label: 'Out',
        icon: ArrowRightOnRectangleIcon,
        match: (path) => path === '/check-out',
      },
      {
        id: 'live',
        to: '/roster-live',
        label: 'Live',
        icon: ChartBarIcon,
        match: (path) => path === '/roster-live',
      },
    )

    return items
  }, [doorOnly, isDesktopViewport, requestEnterKioskMode])
}

/** Grouped items for the desktop side nav during an event. */
export function useEventNavGroups(): StaffNavGroup[] {
  const { requestEnterKioskMode } = useKioskMode()
  const { isDesktopViewport } = useInputMode()
  const { profile } = useAuth()
  const doorOnly = isDoorHelper(profile)

  return useMemo(() => {
    const eventItems: StaffNavItem[] = [
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
        id: 'live',
        to: '/roster-live',
        label: 'Live roster',
        icon: ChartBarIcon,
        match: (path) => path === '/roster-live',
      },
    ]

    if (!doorOnly) {
      eventItems.splice(2, 0, {
        id: 'reading',
        to: '/reading',
        label: 'Reading log',
        icon: BookOpenIcon,
        match: (path) => path === '/reading',
        fieldRoute: true,
      })
    }

    if (!doorOnly && !isDesktopViewport) {
      eventItems.splice(2, 0, {
        id: 'kiosk',
        label: 'Kiosk',
        icon: BookOpenIcon,
        match: (path) => path.startsWith('/kiosk'),
        onSelect: () => requestEnterKioskMode('/kiosk/reading'),
        fieldRoute: true,
      })
    }

    return [{ id: 'event', label: 'Event day', items: eventItems }]
  }, [doorOnly, isDesktopViewport, requestEnterKioskMode])
}
