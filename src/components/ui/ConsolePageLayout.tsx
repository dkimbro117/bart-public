import type { ReactNode } from 'react'
import { consoleListColumn, consolePageGrid, consolePanelColumn } from '../../ui/classes'

type ConsolePageLayoutProps = {
  header: ReactNode
  list: ReactNode
  panel: ReactNode
}

export default function ConsolePageLayout({
  header,
  list,
  panel,
}: ConsolePageLayoutProps) {
  return (
    <section className="space-y-5">
      {header}
      <div className={consolePageGrid}>
        <div className={consoleListColumn}>{list}</div>
        <div className={`${consolePanelColumn} hidden lg:block`}>{panel}</div>
      </div>
    </section>
  )
}
