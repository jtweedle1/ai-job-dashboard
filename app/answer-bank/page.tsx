"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getJobs } from "@/lib/jobs";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import { createAnswer, getAnswers, updateAnswer, deleteAnswer } from "@/lib/answerBank";
import type { Job } from "@/types/job";
import type { AnswerEntry } from "@/types/answerBank";
import StoryTabs from "@/components/StoryTabs";
import Toast from "@/components/Toast";
import { useToast } from "@/lib/use-toast";
import PageFrame from "@/components/ui/PageFrame";
import Button, { IconButton } from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { Field, Input, TextArea, inputClasses } from "@/components/ui/Field";
import { EmptyState, InlineMessage, LoadingBlocks, Sheet } from "@/components/ui/bits";

function parseTags(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function AnswerBankPage() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ question: "", answer: "", tags: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { show: showToast, toastProps } = useToast();
  // "new" for the add form, otherwise the id of the answer being drafted.
  const [draftingFor, setDraftingFor] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<{ for: string; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getJobs(user.uid), getAnswers(user.uid)]).then(([j, a]) => {
      setJobs(j);
      setAnswers(a);
      setLoading(false);
    });
  }, [user]);


  async function handleSave() {
    if (!user || !question.trim() || !answer.trim()) return;
    setSaving(true);
    try {
      const data = {
        question: question.trim(),
        answer: answer.trim(),
        tags: parseTags(tagsInput),
        jobId: selectedJobId || null,
      };
      const id = await createAnswer(user.uid, data);
      const newEntry: AnswerEntry = { id, ...data, useAsVoiceSample: false, createdAt: new Date(), updatedAt: new Date() };
      setAnswers((prev) => [newEntry, ...prev]);
      setQuestion("");
      setAnswer("");
      setTagsInput("");
      setSelectedJobId("");
      showToast("Saved to your answers");
    } finally {
      setSaving(false);
    }
  }

  // Writes an answer from the user's background stories. Returns null (and shows why) on failure.
  async function draftAnswer(target: string, q: string, jobId: string | null): Promise<string | null> {
    setDraftingFor(target);
    setDraftError(null);
    try {
      const res = await authedFetch("/api/draft-answer", {
        method: "POST",
        body: JSON.stringify({ question: q, jobId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setDraftError({ for: target, message: noKeyMessage("draft answers") });
        return null;
      }
      if (data.error === "no_stories") {
        setDraftError({ for: target, message: "Add a past position in Experience first, so there are stories to draw from." });
        return null;
      }
      if (data.error) {
        setDraftError({ for: target, message: aiErrorMessage(res.status, data.error, "Drafting failed. Try again.") });
        return null;
      }
      return data.answer as string;
    } catch {
      setDraftError({ for: target, message: "Something went wrong. Try again." });
      return null;
    } finally {
      setDraftingFor(null);
    }
  }

  async function handleDraftNew() {
    if (!question.trim()) return;
    const text = await draftAnswer("new", question.trim(), selectedJobId || null);
    if (text) setAnswer(text);
  }

  async function handleDraftExisting(entry: AnswerEntry) {
    if (editingId !== entry.id) startEdit(entry);
    const q = editingId === entry.id ? editFields.question : entry.question;
    const text = await draftAnswer(entry.id, q.trim(), entry.jobId);
    if (text) setEditFields((p) => ({ ...p, answer: text }));
  }

  function startEdit(entry: AnswerEntry) {
    setEditingId(entry.id);
    setEditFields({
      question: entry.question,
      answer: entry.answer,
      tags: entry.tags.join(", "),
    });
    setExpandedId(entry.id);
  }

  async function handleEditSave(id: string) {
    if (!user) return;
    setEditSaving(true);
    const patch = {
      question: editFields.question.trim(),
      answer: editFields.answer.trim(),
      tags: parseTags(editFields.tags),
    };
    await updateAnswer(user.uid, id, patch);
    setAnswers((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date() } : a))
    );
    setEditingId(null);
    setEditSaving(false);
    showToast("Updated");
  }

  async function handleDelete(id: string) {
    if (!user) return;
    setDeletingId(id);
    await deleteAnswer(user.uid, id);
    setAnswers((prev) => prev.filter((a) => a.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
    setDeletingId(null);
    showToast("Deleted");
  }

  function jobTitle(jobId: string | null) {
    if (!jobId) return null;
    return jobs.find((j) => j.id === jobId)?.title ?? null;
  }

  const allTags = useMemo(() => {
    const set = new Set<string>();
    answers.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [answers]);

  const filtered = useMemo(() => {
    let result = answers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q)
      );
    }
    if (activeTag) {
      result = result.filter((a) => a.tags.includes(activeTag));
    }
    return result;
  }, [answers, search, activeTag]);

  const frame = (children: React.ReactNode) => (
    <PageFrame
      above={<StoryTabs />}
      title="Answers"
      intro="Answers to application and interview questions, ready to reuse. Draft one from your stories, then make it yours."
    >
      <Toast {...toastProps} />
      {children}
    </PageFrame>
  );

  if (loading) return frame(<LoadingBlocks rows={3} label="Loading your answers" />);

  const jobOptions = [{ value: "", label: "No job linked" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title} at ${j.company}` }))];

  return frame(
    <>
      <Sheet as="section" aria-labelledby="ab-add-heading">
        <h2 id="ab-add-heading" className="font-serif text-heading font-semibold text-ink">
          Add an answer
        </h2>
        <div className="mt-5 space-y-5">
          <Field id="ab-new-question" label="Question">
            <Input
              id="ab-new-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Tell me about a time you led a project under pressure"
            />
          </Field>
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label htmlFor="ab-new-answer" className="text-label font-semibold text-ink">
                Answer
              </label>
              <DraftButton onClick={handleDraftNew} drafting={draftingFor === "new"} disabled={!question.trim() || draftingFor !== null} />
            </div>
            {draftError?.for === "new" && (
              <InlineMessage tone="caution" role="alert" className="mb-2">
                {draftError.message}
              </InlineMessage>
            )}
            <TextArea id="ab-new-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your prepared answer…" rows={5} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <Field id="ab-new-tags" label="Tags" help="Separate them with commas." optional>
              <Input id="ab-new-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="behavioral, leadership" />
            </Field>
            <Field id="ab-new-job" label="Link to a job" optional>
              <Select id="ab-new-job" value={selectedJobId} options={jobOptions} onChange={setSelectedJobId} />
            </Field>
          </div>
          <Button variant="primary" onClick={handleSave} disabled={!question.trim() || !answer.trim()} loading={saving} loadingLabel="Saving…">
            Save answer
          </Button>
        </div>
      </Sheet>

      <section aria-labelledby="ab-list-heading" className="mt-12">
        <h2 id="ab-list-heading" className="mb-4 font-serif text-heading font-semibold text-ink">
          Your answers <span className="font-sans text-meta font-normal text-ink-muted">· {answers.length}</span>
        </h2>

        {answers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[min(100%,16rem)]">
              <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                aria-label="Search answers"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions and answers…"
                className={`${inputClasses} h-10 pl-10 rounded-full`}
              />
            </div>
            {allTags.length > 0 && (
              <div role="group" aria-label="Show only the tag" className="flex flex-wrap gap-1">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
                    aria-pressed={activeTag === tag}
                    className={`h-8 px-3 rounded-full border text-meta font-semibold transition-colors duration-100 ${
                      activeTag === tag ? "border-ink bg-ink text-canvas" : "border-control text-ink-soft hover:bg-well hover:text-ink"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <ul>
            {filtered.map((entry) => {
              const open = expandedId === entry.id;
              return (
                <li key={entry.id} className="py-4 border-b border-rule last:border-b-0">
                  {editingId === entry.id ? (
                    <div className="space-y-4">
                      <Field id={`ab-${entry.id}-question`} label="Question">
                        <Input
                          id={`ab-${entry.id}-question`}
                          value={editFields.question}
                          onChange={(e) => setEditFields((p) => ({ ...p, question: e.target.value }))}
                        />
                      </Field>
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <label htmlFor={`ab-${entry.id}-answer`} className="text-label font-semibold text-ink">
                            Answer
                          </label>
                          <DraftButton
                            onClick={() => handleDraftExisting(entry)}
                            drafting={draftingFor === entry.id}
                            disabled={!editFields.question.trim() || draftingFor !== null}
                          />
                        </div>
                        {draftError?.for === entry.id && (
                          <InlineMessage tone="caution" role="alert" className="mb-2">
                            {draftError.message}
                          </InlineMessage>
                        )}
                        <TextArea
                          id={`ab-${entry.id}-answer`}
                          value={editFields.answer}
                          onChange={(e) => setEditFields((p) => ({ ...p, answer: e.target.value }))}
                          rows={6}
                        />
                      </div>
                      <Field id={`ab-${entry.id}-tags`} label="Tags" optional>
                        <Input
                          id={`ab-${entry.id}-tags`}
                          value={editFields.tags}
                          onChange={(e) => setEditFields((p) => ({ ...p, tags: e.target.value }))}
                          placeholder="behavioral, leadership"
                        />
                      </Field>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleEditSave(entry.id)}
                          disabled={!editFields.question.trim() || !editFields.answer.trim()}
                          loading={editSaving}
                          loadingLabel="Saving…"
                        >
                          Save
                        </Button>
                        <Button variant="quiet" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => setExpandedId(open ? null : entry.id)}
                          aria-expanded={open}
                          className="flex-1 min-w-0 text-left rounded-stamp outline-offset-4 group"
                        >
                          <span className="block font-semibold text-ink group-hover:text-action transition-colors duration-100">{entry.question}</span>
                          {entry.answer.trim() && (
                            <span className={`mt-1 text-ink-soft whitespace-pre-wrap ${open ? "block" : "line-clamp-2"}`}>{entry.answer}</span>
                          )}
                        </button>
                        <IconButton icon="ti-pencil" label="Edit answer" size="sm" onClick={() => startEdit(entry)} />
                        <IconButton
                          icon="ti-trash"
                          label="Delete answer"
                          size="sm"
                          disabled={deletingId === entry.id}
                          onClick={() => handleDelete(entry.id)}
                        />
                      </div>

                      {(entry.tags.length > 0 || (entry.jobId && jobTitle(entry.jobId))) && (
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-muted">
                          {entry.tags.map((tag) => (
                            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? "" : tag)} className="hit hover:text-ink hover:underline underline-offset-4">
                              #{tag}
                            </button>
                          ))}
                          {entry.jobId && jobTitle(entry.jobId) && <span>For {jobTitle(entry.jobId)}</span>}
                        </p>
                      )}

                      {!entry.answer.trim() && (
                        <div className="mt-2">
                          <p className="text-ink-muted mb-1">No answer yet.</p>
                          <DraftButton onClick={() => handleDraftExisting(entry)} drafting={draftingFor === entry.id} disabled={draftingFor !== null} />
                          {draftError?.for === entry.id && (
                            <InlineMessage tone="caution" role="alert" className="mt-2">
                              {draftError.message}
                            </InlineMessage>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {answers.length === 0 && <EmptyState title="No answers yet">Add your first one above, or save a question from a job&apos;s interview prep.</EmptyState>}
        {answers.length > 0 && filtered.length === 0 && <EmptyState title="Nothing matches that search" />}
      </section>
    </>
  );
}

function DraftButton({ onClick, drafting, disabled }: { onClick: () => void; drafting: boolean; disabled: boolean }) {
  return (
    <Button variant="quiet" size="sm" icon="ti-wand" onClick={onClick} disabled={disabled} loading={drafting} loadingLabel="Drafting…">
      Draft from my stories
    </Button>
  );
}
