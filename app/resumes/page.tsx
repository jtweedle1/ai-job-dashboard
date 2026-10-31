"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth-context";
import { db, storage } from "@/lib/firebase";
import { authedFetch } from "@/lib/api-client";
import { getResumes, createResume, deleteResume, setActiveResume } from "@/lib/resumes";
import type { Resume } from "@/types/resume";
import { timeAgo } from "@/lib/next-steps";
import { useToast } from "@/lib/use-toast";
import Toast from "@/components/Toast";
import PageFrame from "@/components/ui/PageFrame";
import Button from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import Dialog from "@/components/ui/Dialog";
import { Field, Input, TextArea } from "@/components/ui/Field";
import { EmptyState, InlineMessage, Skeleton } from "@/components/ui/bits";

type Tab = "paste" | "pdf";

export default function ResumesPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("paste");
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState("");
  const [saveError, setSaveError] = useState("");
  const { show: showToast, toastProps } = useToast();
  const [now] = useState(() => new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [resumeList, userSnap] = await Promise.all([
      getResumes(user.uid),
      getDoc(doc(db, "users", user.uid)),
    ]);
    setResumes(resumeList);
    setActiveResumeId(userSnap.data()?.activeResumeId ?? null);
    setLoading(false);
  }

  async function handlePdfSelect(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setParseError("That file is over 5 MB. Try a smaller PDF, or paste the text instead.");
      return;
    }
    setPdfFile(file);
    setPdfText("");
    setParseError("");
    setParsing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await authedFetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setPdfText(data.text);
      } else {
        setParseError(data.error ?? "We couldn't read text from that PDF. Try pasting it instead.");
      }
    } catch {
      setParseError("We couldn't reach the PDF reader. Try pasting the text instead.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!user || !label.trim()) return;
    const textContent = tab === "paste" ? content : pdfText;
    if (!textContent.trim()) return;

    setSaving(true);
    setSaveError("");
    try {
      let fileUrl: string | null = null;

      if (tab === "pdf" && pdfFile) {
        const path = `resumes/${user.uid}/${Date.now()}_${pdfFile.name}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, pdfFile);
        fileUrl = await getDownloadURL(fileRef);
      }

      const newId = await createResume(user.uid, label.trim(), textContent, fileUrl);

      const newResume: Resume = {
        id: newId,
        label: label.trim(),
        content: textContent,
        fileUrl,
        createdAt: new Date(),
      };

      const isFirst = resumes.length === 0;
      if (isFirst) {
        await setActiveResume(user.uid, newId);
        setActiveResumeId(newId);
      }

      setResumes((prev) => [newResume, ...prev]);
      closeModal();
      showToast("Resume added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("storage") || msg.includes("Storage") || msg.includes("bucket")) {
        setSaveError("File storage isn't set up for this app yet, so the PDF couldn't be kept. Paste the text instead.");
      } else {
        setSaveError("Couldn't save your resume. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(resumeId: string) {
    if (!user) return;
    await setActiveResume(user.uid, resumeId);
    setActiveResumeId(resumeId);
    showToast("Now your main resume");
  }

  async function handleDelete(resumeId: string) {
    if (!user) return;
    await deleteResume(user.uid, resumeId);
    if (activeResumeId === resumeId) {
      await updateDoc(doc(db, "users", user.uid), { activeResumeId: null });
      setActiveResumeId(null);
    }
    setResumes((prev) => prev.filter((r) => r.id !== resumeId));
    setDeleteConfirm(null);
    showToast("Resume deleted");
  }

  function closeModal() {
    setModalOpen(false);
    setTab("paste");
    setLabel("");
    setContent("");
    setPdfFile(null);
    setPdfText("");
    setParseError("");
    setSaveError("");
  }

  const canSave =
    label.trim().length > 0 &&
    (tab === "paste" ? content.trim().length > 0 : pdfText.trim().length > 0);

  const confirming = resumes.find((r) => r.id === deleteConfirm);
  const addButton = (
    <Button variant="primary" icon="ti-plus" onClick={() => setModalOpen(true)}>
      Add a resume
    </Button>
  );

  return (
    <PageFrame title="Resume" intro="Letters and fit scores start from your main resume. Keep other versions here too." action={resumes.length > 0 ? addButton : undefined}>
      <Toast {...toastProps} />

      {loading ? (
        <div aria-busy="true" role="status" className="space-y-4">
          <span className="sr-only">Loading your resumes…</span>
          {[1, 2].map((n) => (
            <div key={n} className="space-y-2 py-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <EmptyState title="Start with your resume" action={addButton}>
          Paste it or upload a PDF. Every letter and fit score is built from it.
        </EmptyState>
      ) : (
        <ul>
          {resumes.map((resume) => {
            const isActive = resume.id === activeResumeId;
            return (
              <li key={resume.id} className="flex items-center gap-4 py-4 border-b border-rule last:border-b-0">
                <span
                  className={`w-3 h-3 shrink-0 rounded-full ${isActive ? "bg-sun ring-4 ring-sun-wash" : "border-[1.5px] border-control"}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">
                    {resume.label}
                    {isActive && <span className="ml-2 text-meta font-semibold text-sun-ink">Main resume</span>}
                  </p>
                  <p className="text-meta text-ink-soft">
                    Added {timeAgo(resume.createdAt, now).replace(/^(Today|Yesterday)$/, (m) => m.toLowerCase())}
                    {resume.fileUrl && (
                      <>
                        {" · "}
                        <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-action hover:underline underline-offset-4">
                          View PDF<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </>
                    )}
                  </p>
                </div>
                {!isActive && (
                  <Button size="sm" onClick={() => handleSetActive(resume.id)}>
                    Make main
                  </Button>
                )}
                <Menu
                  label={`More actions for ${resume.label}`}
                  items={[{ label: "Delete resume", icon: "ti-trash", danger: true, onSelect: () => setDeleteConfirm(resume.id) }]}
                />
              </li>
            );
          })}
        </ul>
      )}

      {confirming && (
        <Dialog
          title={`Delete “${confirming.label}”?`}
          description="Letters you already wrote from it stay. This can't be undone."
          onRequestClose={() => setDeleteConfirm(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Keep it
              </Button>
              <Button variant="danger-solid" onClick={() => handleDelete(confirming.id)}>
                Delete resume
              </Button>
            </>
          }
        />
      )}

      {modalOpen && (
        <Dialog
          title="Add a resume"
          onRequestClose={closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={!canSave} loading={saving} loadingLabel="Saving…">
                Save resume
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            <Field id="resume-label" label="Name it" help="Something you'll recognize, like “Product design” or “Research roles”.">
              <Input id="resume-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Product design" autoFocus />
            </Field>

            <div>
              <div role="tablist" aria-label="How to add it" className="flex gap-6 border-b border-rule mb-4">
                {(["paste", "pdf"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`relative h-10 text-ui font-semibold transition-colors duration-100 ${tab === t ? "text-ink" : "text-ink-soft hover:text-ink"}`}
                  >
                    {t === "paste" ? "Paste text" : "Upload a PDF"}
                    {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-ink" aria-hidden="true" />}
                  </button>
                ))}
              </div>

              {tab === "paste" ? (
                <TextArea aria-label="Resume text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your resume text here…" rows={12} />
              ) : (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePdfSelect(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-field border-[1.5px] border-dashed border-control p-6 text-center hover:bg-well transition-colors duration-100"
                  >
                    <i className="ti ti-upload text-2xl text-ink-soft block mb-2" aria-hidden="true" />
                    {pdfFile ? (
                      <span className="block font-semibold text-ink">{pdfFile.name}</span>
                    ) : (
                      <>
                        <span className="block font-semibold text-ink">Choose a PDF</span>
                        <span className="block mt-0.5 text-meta text-ink-soft">Up to 5 MB</span>
                      </>
                    )}
                  </button>
                  {parsing && (
                    <p role="status" className="flex items-center gap-2 text-ink-soft">
                      <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />
                      Reading the text…
                    </p>
                  )}
                  {parseError && (
                    <InlineMessage tone="caution" role="alert">
                      {parseError}
                    </InlineMessage>
                  )}
                  {pdfText && !parsing && (
                    <Field id="resume-pdf-text" label="The text we found" help="Fix anything that came through wrong.">
                      <TextArea id="resume-pdf-text" value={pdfText} onChange={(e) => setPdfText(e.target.value)} rows={10} />
                    </Field>
                  )}
                </div>
              )}
            </div>
            {saveError && (
              <InlineMessage tone="danger" role="alert">
                {saveError}
              </InlineMessage>
            )}
          </div>
        </Dialog>
      )}
    </PageFrame>
  );
}
