import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 md:p-8">
      <div className="surface-panel grid w-full max-w-6xl overflow-hidden md:grid-cols-[1.2fr_0.95fr]">
        <section className="hidden flex-col justify-between border-r border-border/70 bg-gradient-to-b from-primary/10 via-transparent to-accent/40 p-10 md:flex">
          <div className="space-y-4">
            <p className="kicker">Internal Analytics Workspace</p>
            <h1 className="text-4xl font-semibold text-foreground">
              SpreadDash
            </h1>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              Upload spreadsheets, detect performance trends, generate AI-backed summaries, and share clean dashboard exports with your team.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="surface-card px-3 py-4">
              <p className="text-xl font-semibold">CSV</p>
              <p className="text-xs text-muted-foreground">Upload</p>
            </div>
            <div className="surface-card px-3 py-4">
              <p className="text-xl font-semibold">AI</p>
              <p className="text-xs text-muted-foreground">Insights</p>
            </div>
            <div className="surface-card px-3 py-4">
              <p className="text-xl font-semibold">PDF</p>
              <p className="text-xs text-muted-foreground">Export</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-background/80 px-5 py-8 md:px-10">
          <LoginForm />
        </section>
      </div>
    </div>
  )
}
