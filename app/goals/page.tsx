"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/use-toast";
import Toast from "@/components/Toast";
import PageFrame from "@/components/ui/PageFrame";
import Button from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/bits";

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show, toastProps } = useToast();

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => setGoals(snap.data()?.goals ?? ""))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { goals });
      show("Goals saved");
    } catch {
      show("Couldn't save your goals. Check your connection and try again.", { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageFrame title="Goals" intro="What you're looking for. Fit scores on each job are measured against this.">
      <Toast {...toastProps} />
      <label htmlFor="goals" className="block font-serif text-heading font-semibold text-ink">
        What would make the next role a yes?
      </label>
      <p id="goals-help" className="mt-1 mb-4 text-ink-soft">
        Income needs, growth path, interests, deal-breakers. Plain sentences are fine.
      </p>
      {loading ? (
        <Skeleton className="h-48 rounded-field" />
      ) : (
        <TextArea
          id="goals"
          aria-describedby="goals-help"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="e.g. Looking for a senior IC role at a Series B to D startup. Interested in developer tools or data infrastructure. Targeting $180k to $220k. Remote-first preferred."
          rows={8}
          className="text-reading"
        />
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={loading} loading={saving} loadingLabel="Saving…">
          Save goals
        </Button>
      </div>
    </PageFrame>
  );
}
