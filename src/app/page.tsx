export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl flex flex-col gap-8">
        <span className="inline-flex w-fit items-center rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
          Product marketing agents
        </span>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Build agents that do
          <br />
          your PMM work.
        </h1>

        <p className="text-lg leading-relaxed text-muted max-w-md">
          Scaffold, run, and iterate on marketing agents — battlecards,
          positioning, content calendars — grounded in your own data.
        </p>

        <a
          href="#"
          className="inline-flex w-fit items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-opacity hover:opacity-90"
        >
          Get started
        </a>
      </div>
    </main>
  );
}
