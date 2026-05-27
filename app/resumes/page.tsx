"use client";

import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/lib/auth-context";
import { db, storage } from "@/lib/firebase";
import { getResumes, createResume, deleteResume, setActiveResume } from "@/lib/resumes";
import type { Resume } from "@/types/resume";

type Tab = "paste" | "pdf";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ResumesPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Modal state
  const [tab, setTab] = useState<Tab>("paste");
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState("");

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
    setPdfFile(file);
    setPdfText("");
    setParseError("");
    setParsing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        setPdfText(data.text);
      } else {
        setParseError(data.error ?? "Could not extract text from PDF.");
      }
    } catch {
      setParseError("Failed to contact the parser. Try pasting text instead.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!user || !label.trim()) return;
    const textContent = tab === "paste" ? content : pdfText;
    if (!textContent.trim()) return;

    setSaving(true);
    try {
      let fileUrl: string | null = null;

      if (tab === "pdf" && pdfFile) {
        const path = `resumes/${user.uid}/${Date.now()}_${pdfFile.name}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, pdfFile);
        fileUrl = await getDownloadURL(fileRef);
      }

      const newId = await createResume(user.uid, label.trim(), textContent, fileUrl);

      // Auto-set as active if it's the first resume
      if (resumes.length === 0) {
        await setActiveResume(user.uid, newId);
        setActiveResumeId(newId);
      }

      await loadData();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleSetActive(resumeId: string) {
    if (!user) return;
    await setActiveResume(user.uid, resumeId);
    setActiveResumeId(resumeId);
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
  }

  function closeModal() {
    setModalOpen(false);
    setTab("paste");
    setLabel("");
    setContent("");
    setPdfFile(null);
    setPdfText("");
    setParseError("");
  }

  const canSave =
    label.trim().length > 0 &&
    (tab === "paste" ? content.trim().length > 0 : pdfText.trim().length > 0);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Resumes</h1>
          <p className="text-sm text-gray-500">Manage your resume versions</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Add resume
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <i className="ti ti-file-cv text-gray-400 text-2xl" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-medium text-gray-900 mb-1">No resumes yet</h2>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            Add a resume version to use with cover letters, fit scoring, and more.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <i className="ti ti-plus text-sm" aria-hidden="true" />
            Add resume
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => {
            const isActive = resume.id === activeResumeId;
            const confirmingDelete = deleteConfirm === resume.id;

            return (
              <div
                key={resume.id}
                className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-4 ${
                  isActive ? "border-emerald-200" : "border-gray-100"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {resume.label}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <i className="ti ti-check text-xs" aria-hidden="true" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Added {formatDate(resume.createdAt)}</p>
                  {resume.fileUrl && (
                    <a
                      href={resume.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-1"
                    >
                      <i className="ti ti-file-type-pdf text-xs" aria-hidden="true" />
                      View PDF
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => handleSetActive(resume.id)}
                      className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Set active
                    </button>
                  )}

                  {confirmingDelete ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Delete?</span>
                      <button
                        onClick={() => handleDelete(resume.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(resume.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Delete resume"
                    >
                      <i className="ti ti-trash text-sm" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Add resume</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <i className="ti ti-x text-base" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Software Engineer – May 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Tabs */}
              <div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
                  {(["paste", "pdf"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-md transition-colors ${
                        tab === t
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <i
                        className={`ti ${t === "paste" ? "ti-align-left" : "ti-file-type-pdf"} text-sm`}
                        aria-hidden="true"
                      />
                      {t === "paste" ? "Paste text" : "Upload PDF"}
                    </button>
                  ))}
                </div>

                {tab === "paste" ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your resume text here…"
                    rows={12}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono"
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Drop zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                    >
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
                      <i className="ti ti-upload text-2xl text-gray-300 mb-2 block" aria-hidden="true" />
                      {pdfFile ? (
                        <p className="text-sm text-gray-700 font-medium">{pdfFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-gray-500">Click to select a PDF</p>
                          <p className="text-xs text-gray-400 mt-1">PDF files only</p>
                        </>
                      )}
                    </div>

                    {parsing && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <i className="ti ti-loader-2 animate-spin text-base" aria-hidden="true" />
                        Extracting text…
                      </div>
                    )}

                    {parseError && (
                      <p className="text-xs text-red-500">{parseError}</p>
                    )}

                    {pdfText && !parsing && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">
                          Extracted text — review and edit if needed
                        </p>
                        <textarea
                          value={pdfText}
                          onChange={(e) => setPdfText(e.target.value)}
                          rows={10}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none font-mono"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Add resume"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
