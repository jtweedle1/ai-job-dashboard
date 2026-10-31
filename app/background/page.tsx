"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getBackgrounds,
  createBackground,
  updateBackground,
  setBackgroundIncluded,
  deleteBackground,
  type BackgroundInput,
} from "@/lib/backgrounds";
import Toggle from "@/components/Toggle";
import { BACKGROUND_QUESTIONS, backgroundHeading, hasBackgroundContent } from "@/types/background";
import type { Background } from "@/types/background";
import StoryTabs from "@/components/StoryTabs";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import PageFrame from "@/components/ui/PageFrame";
import Button from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import Dialog from "@/components/ui/Dialog";
import { Field, Input, TextArea } from "@/components/ui/Field";
import { EmptyState, LoadingBlocks, Sheet } from "@/components/ui/bits";


const EMPTY_FORM: BackgroundInput = { title: "", company: "", startDate: "", endDate: "", answers: {} };

function answeredCount(b: Background) {
  return BACKGROUND_QUESTIONS.filter((q) => (b.answers[q.id] ?? "").trim()).length;
}

export default function BackgroundPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);

  // null = form closed, "new" = adding, otherwise the id being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BackgroundInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { show: showToast, toastProps } = useToast();

  useEffect(() => {
    if (!user) return;
    getBackgrounds(user.uid).then((b) => {
      setBackgrounds(b);
      setLoading(false);
    });
  }, [user]);


  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId("new");
  }

  function openEdit(b: Background) {
    setForm({ title: b.title, company: b.company, startDate: b.startDate, endDate: b.endDate, answers: { ...b.answers } });
    setEditingId(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setAnswer(id: string, value: string) {
    setForm((f) => ({ ...f, answers: { ...f.answers, [id]: value } }));
  }

  const canSave =
    (form.title.trim() || form.company.trim()).length > 0 && hasBackgroundContent(form.answers);

  async function handleSave() {
    if (!user || !editingId || !canSave) return;
    setSaving(true);
    const data: BackgroundInput = {
      title: form.title.trim(),
      company: form.company.trim(),
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim(),
      answers: Object.fromEntries(
        Object.entries(form.answers)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v)
      ),
    };
    try {
      if (editingId === "new") {
        const id = await createBackground(user.uid, data);
        const now = new Date();
        setBackgrounds((prev) => [{ id, ...data, included: true, createdAt: now, updatedAt: now }, ...prev]);
        showToast("Position saved");
      } else {
        await updateBackground(user.uid, editingId, data);
        setBackgrounds((prev) =>
          prev.map((b) => (b.id === editingId ? { ...b, ...data, updatedAt: new Date() } : b))
        );
        showToast("Changes saved");
      }
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(b: Background, included: boolean) {
    if (!user) return;
    setBackgrounds((prev) => prev.map((x) => (x.id === b.id ? { ...x, included } : x)));
    await setBackgroundIncluded(user.uid, b.id, included);
  }

  async function handleDelete(id: string) {
    if (!user) return;
    await deleteBackground(user.uid, id);
    setBackgrounds((prev) => prev.filter((b) => b.id !== id));
    setDeleteConfirm(null);
    if (editingId === id) setEditingId(null);
    showToast("Deleted");
  }

  const frame = (children: React.ReactNode, action?: React.ReactNode) => (
    <PageFrame
      above={<StoryTabs />}
      title="Experience"
      intro="The real stories behind each job. Letters draw from the positions you switch on, so you don't have to retell them every time."
      action={action}
    >
      <Toast {...toastProps} />
      {children}
    </PageFrame>
  );

  if (loading) return frame(<LoadingBlocks rows={3} label="Loading your experience" />);

  const includedCount = backgrounds.filter((b) => b.included).length;
  const confirming = backgrounds.find((b) => b.id === deleteConfirm);
  const field = (id: keyof typeof form, label: string, placeholder: string) => (
    <Field id={`bg-${id}`} label={label}>
      <Input
        id={`bg-${id}`}
        value={form[id] as string}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        placeholder={placeholder}
      />
    </Field>
  );

  return frame(
    <>
      {editingId !== null && (
        <Sheet as="section" aria-labelledby="bg-form-heading" className="mb-12">
          <h2 id="bg-form-heading" className="font-serif text-heading font-semibold text-ink">
            {editingId === "new" ? "A new position" : "Edit this position"}
          </h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            {field("title", "Job title", "e.g. Product Designer")}
            {field("company", "Company", "e.g. Acme Co")}
            {field("startDate", "Started", "e.g. Mar 2021")}
            {field("endDate", "Ended", "e.g. Present")}
          </div>
          <p className="mt-8 mb-5 text-ink-soft">
            Answer as many as you like, in bullets or paragraphs. Skip anything that doesn&apos;t apply. Only write
            what&apos;s true: letters treat this as fact.
          </p>
          <div className="space-y-6">
            {BACKGROUND_QUESTIONS.map((q) => (
              <Field key={q.id} id={`bg-q-${q.id}`} label={q.label} help={q.hint} optional>
                <TextArea id={`bg-q-${q.id}`} value={form.answers[q.id] ?? ""} onChange={(e) => setAnswer(q.id, e.target.value)} rows={4} />
              </Field>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-end gap-2 flex-wrap">
            {!canSave && <p className="mr-auto text-meta text-ink-soft">Add a title or company and answer one question to save.</p>}
            <Button variant="quiet" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave} loading={saving} loadingLabel="Saving…">
              Save position
            </Button>
          </div>
        </Sheet>
      )}

      {backgrounds.length > 0 ? (
        <section aria-labelledby="positions-heading">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <h2 id="positions-heading" className="font-serif text-heading font-semibold text-ink">
              Positions
            </h2>
            <p className="text-meta text-ink-soft">
              {includedCount} of {backgrounds.length} used in letters
            </p>
          </div>
          <ul>
            {backgrounds.map((b) => {
              const open = expandedId === b.id;
              return (
                <li key={b.id} className="py-3 border-b border-rule last:border-b-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedId(open ? null : b.id)}
                      aria-expanded={open}
                      className="min-w-0 flex-1 text-left py-1 px-3 -mx-3 rounded-field hover:bg-well transition-colors duration-100"
                    >
                      <span className="block font-semibold text-ink truncate">{backgroundHeading(b)}</span>
                      <span className="block text-meta text-ink-soft">
                        {answeredCount(b)} of {BACKGROUND_QUESTIONS.length} questions answered
                      </span>
                    </button>
                    <Toggle checked={b.included} onChange={(v) => handleToggle(b, v)} label={`Use ${backgroundHeading(b)} in letters`} />
                    <Menu
                      label={`More actions for ${backgroundHeading(b)}`}
                      items={[
                        { label: "Edit", icon: "ti-pencil", onSelect: () => openEdit(b) },
                        { label: "Delete position", icon: "ti-trash", danger: true, onSelect: () => setDeleteConfirm(b.id) },
                      ]}
                    />
                  </div>
                  {open && (
                    <div className="mt-3 mb-2 space-y-4 animate-[fade-in_200ms_var(--ease-out)]">
                      {BACKGROUND_QUESTIONS.filter((q) => (b.answers[q.id] ?? "").trim()).map((q) => (
                        <div key={q.id}>
                          <p className="text-label font-semibold text-ink-soft">{q.label}</p>
                          <p className="mt-1 text-ink whitespace-pre-wrap">{b.answers[q.id]}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        editingId === null && (
          <EmptyState
            title="No positions yet"
            action={
              <Button variant="primary" icon="ti-plus" onClick={openNew}>
                Add a position
              </Button>
            }
          >
            Add one and answer a few questions about what you did there.
          </EmptyState>
        )
      )}

      {confirming && (
        <Dialog
          title={`Delete ${backgroundHeading(confirming)}?`}
          description="Letters you already wrote keep their text. This can't be undone."
          onRequestClose={() => setDeleteConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Keep it
              </Button>
              <Button variant="danger-solid" onClick={() => handleDelete(confirming.id)}>
                Delete position
              </Button>
            </>
          }
        />
      )}
    </>,
    editingId === null && backgrounds.length > 0 ? (
      <Button variant="primary" icon="ti-plus" onClick={openNew}>
        Add a position
      </Button>
    ) : undefined
  );
}
