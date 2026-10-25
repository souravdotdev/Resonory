import { WaitlistForm } from "./waitlist-form";

// A plain page for now; the hero layout and showcase come later.
export default function WaitlistPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-semibold text-balance">
        You saved it.
        <br />
        Resonory brings it back.
      </h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <WaitlistForm />
      </div>
    </main>
  );
}
