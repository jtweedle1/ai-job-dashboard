"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/api-client";
import Link from "next/link";
import { useToast } from "@/lib/use-toast";
import Toast from "@/components/Toast";
import PageFrame from "@/components/ui/PageFrame";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { InlineMessage, Section, Skeleton } from "@/components/ui/bits";

type KeyStatus = "loading" | "saved" | "none";

export default function SettingsPage() {
  const { user } = useAuth();

  const [keyStatus, setKeyStatus] = useState<KeyStatus>("loading");
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const { show, toastProps } = useToast();


  useEffect(() => {
    if (!user) return;

    authedFetch("/api/settings/api-key")
      .then((r) => r.json())
      .then((d) => setKeyStatus(d.hasKey ? "saved" : "none"))
      .catch(() => setKeyStatus("none"));

  }, [user]);

  const showKeyToast = (msg: string) => show(msg);


  async function handleSaveKey() {
    if (!user || !keyInput.trim()) return;
    setSavingKey(true);
    setKeyError("");
    try {
      const res = await authedFetch("/api/settings/api-key", {
        method: "POST",
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      });
      if (!res.ok) throw new Error();
      setKeyStatus("saved");
      setKeyInput("");
      setKeyError("");
      showKeyToast("Key saved");
    } catch {
      setKeyError("Couldn't save the key. Check it and try again.");
    } finally {
      setSavingKey(false);
    }
  }

  async function handleRemoveKey() {
    if (!user) return;
    setRemovingKey(true);
    try {
      await authedFetch("/api/settings/api-key", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      setKeyStatus("none");
      showKeyToast("Key removed");
    } catch {
      setKeyError("Couldn't remove the key. Try again.");
    } finally {
      setRemovingKey(false);
    }
  }


  return (
    <PageFrame title="Settings">
      <Toast {...toastProps} />

      <div className="space-y-12">
        <Section title="Anthropic API key" serif id="api-key">
          {keyStatus === "loading" ? (
            <Skeleton className="h-5 w-40" />
          ) : keyStatus === "saved" ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="flex items-center gap-2 text-ink">
                <i className="ti ti-check text-moss" aria-hidden="true" />
                Your key is saved. Letters, prep and fit scores are ready.
              </p>
              <Button variant="danger" size="sm" onClick={handleRemoveKey} loading={removingKey} loadingLabel="Removing…">
                Remove key
              </Button>
            </div>
          ) : (
            <>
              <InlineMessage tone="info" className="mb-5">
                Add your Anthropic key to draft letters, build interview prep and score fit.
              </InlineMessage>
              <label htmlFor="api-key-input" className="block text-label font-semibold text-ink mb-1.5">
                Your key
              </label>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Input
                  id="api-key-input"
                  type="password"
                  autoComplete="off"
                  aria-describedby="api-key-help"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                  placeholder="sk-ant-…"
                  className="font-mono flex-1 min-w-0"
                />
                <Button variant="primary" size="lg" className="h-11" onClick={handleSaveKey} disabled={!keyInput.trim()} loading={savingKey} loadingLabel="Saving…">
                  Save key
                </Button>
              </div>
              <p id="api-key-help" className="mt-2 text-meta text-ink-soft">
                It&apos;s encrypted before it&apos;s stored and never sent back to your browser.
              </p>
            </>
          )}
          {keyError && (
            <InlineMessage tone="danger" role="alert" className="mt-4">
              {keyError}
            </InlineMessage>
          )}
        </Section>

        <Section title="Career goals" serif id="goals">
          <p className="text-ink-soft">
            Your goals now live in Me, next to your resume, library and voice.{" "}
            <Link href="/goals" className="font-semibold text-action hover:underline underline-offset-4">
              Go to Goals
            </Link>
          </p>
        </Section>

        <Section title="Account" serif id="account">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-well text-ink-soft inline-flex items-center justify-center" aria-hidden="true">
                  <i className="ti ti-user" />
                </span>
              )}
              <div>
                <p className="font-semibold text-ink">{user.isAnonymous ? "Demo visitor" : user.displayName}</p>
                <p className="text-meta text-ink-soft">
                  {user.isAnonymous ? "Exploring the demo. Nothing here is linked to a real account." : `${user.email} · signed in with Google`}
                </p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-10 w-56" />
          )}
        </Section>
      </div>
    </PageFrame>
  );
}
