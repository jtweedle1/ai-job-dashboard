import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Signpost } from "@/components/illustrations";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-canvas text-ink flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <Signpost className="mx-auto mb-6 text-ink" />
        <h1 className="font-serif text-title font-semibold">This trail doesn&apos;t go anywhere</h1>
        <p className="mt-2 text-ink-soft">That page doesn&apos;t exist, or it moved.</p>
        <Link href="/dashboard" className={buttonClasses({ variant: "primary", className: "mt-6" })}>
          Back to Today
        </Link>
      </div>
    </main>
  );
}
