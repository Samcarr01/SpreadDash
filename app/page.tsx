import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <div className="hero-shell flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="surface-panel grid w-full max-w-6xl overflow-hidden md:grid-cols-[1.15fr_0.9fr]">
        <section className="hidden flex-col justify-between border-r border-border/70 px-10 py-12 md:flex">
          <div className="space-y-5">
            <p className="kicker">Internal Analytics Workspace</p>
            <h1 className="text-5xl font-semibold leading-tight text-foreground">
              SpreadDash
            </h1>
            <p className="max-w-lg text-[15px] leading-7 text-muted-foreground">
              Transform spreadsheets into clear executive dashboards with reliable trend detection, AI commentary, and export-ready reports.
            </p>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="surface-card px-4 py-3">1. Upload spreadsheet data</p>
            <p className="surface-card px-4 py-3">2. Review KPI and trend summaries</p>
            <p className="surface-card px-4 py-3">3. Share insights with PDF exports</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 md:px-10">
          <LoginForm />
        </section>
      </div>
    </div>
  )
}
