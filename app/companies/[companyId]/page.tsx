"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch, noKeyMessage } from "@/lib/api-client";
import { aiErrorMessage } from "@/lib/ai-errors";
import { getCompany, updateCompany, deleteCompany } from "@/lib/companies";
import { getJob } from "@/lib/jobs";
import EditableField from "@/components/EditableField";
import type { Company } from "@/types/company";
import type { Job } from "@/types/job";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { timeAgo } from "@/lib/next-steps";
import { useToast } from "@/lib/use-toast";
import Toast from "@/components/Toast";
import PageFrame from "@/components/ui/PageFrame";
import Button, { buttonClasses } from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import Dialog from "@/components/ui/Dialog";
import { EmptyState, InlineMessage, LoadingBlocks, Monogram, Section } from "@/components/ui/bits";

const PROFILE_FIELDS: { key: keyof Company; label: string; placeholder: string }[] = [
  { key: "whatTheyDo",       label: "What they do",       placeholder: "Describe what this company does…" },
  { key: "productSummary",   label: "Product summary",    placeholder: "Summarise their main product or service…" },
  { key: "targetCustomers",  label: "Target customers",   placeholder: "Who do they sell to?…" },
  { key: "recentNews",       label: "Recent news",        placeholder: "Any notable recent news or announcements…" },
  { key: "values",           label: "Values",             placeholder: "Company values or culture notes…" },
  { key: "competitors",      label: "Competitors",        placeholder: "Main competitors in their space…" },
  { key: "whyInterested",    label: "Why interested",     placeholder: "Why does this company appeal to you?…" },
];

export default function CompanyProfilePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [linkedJob, setLinkedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [fillError, setFillError] = useState("");
  const { show, toastProps } = useToast();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getCompany(user.uid, companyId).then(async (c) => {
      if (!c) { setNotFound(true); setLoading(false); return; }
      setCompany(c);
      if (c.jobId) {
        const job = await getJob(user.uid, c.jobId);
        setLinkedJob(job);
      }
      setLoading(false);
    });
  }, [user, companyId]);

  const save = useCallback(
    async (patch: Partial<Omit<Company, "id" | "createdAt">>) => {
      if (!user || !company) return;
      setCompany((prev) => (prev ? { ...prev, ...patch } : prev));
      await updateCompany(user.uid, companyId, patch);
    },
    [user, company, companyId]
  );

  function showToast(msg: string, error = false) {
    show(msg, error ? { tone: "error" } : {});
  }

  async function handleAutoFill() {
    if (!user) return;
    setFilling(true);
    setFillError("");
    try {
      const res = await authedFetch("/api/company-research", {
        method: "POST",
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "no_key") {
        setFillError(noKeyMessage("use AI auto-fill"));
        return;
      }
      if (data.error) {
        setFillError(aiErrorMessage(res.status, data.error, "Auto-fill failed. Try again."));
        return;
      }
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              whatTheyDo:      data.whatTheyDo      ?? prev.whatTheyDo,
              productSummary:  data.productSummary  ?? prev.productSummary,
              targetCustomers: data.targetCustomers ?? prev.targetCustomers,
              recentNews:      data.recentNews      ?? prev.recentNews,
              values:          data.values          ?? prev.values,
              competitors:     data.competitors     ?? prev.competitors,
            }
          : prev
      );
      showToast("Filled in. Check each one and fix anything that's off.");
    } catch {
      setFillError("Something went wrong. Try again.");
    } finally {
      setFilling(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      showToast("That isn't an image. Choose a PNG, JPG or SVG.", true);
      return;
    }
    setUploadingLogo(true);
    try {
      const fileRef = storageRef(storage, `${user.uid}/companies/${companyId}/logo`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await save({ logoUrl: url });
      showToast("Logo uploaded");
    } catch (err) {
      console.error("Logo upload error:", err);
      showToast("The logo didn't upload. Try again.", true);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    await deleteCompany(user.uid, companyId);
    router.push("/companies");
  }

  const back = (
    <Link href="/companies" className="inline-flex items-center gap-1 text-meta font-semibold text-ink-soft hover:text-ink">
      <i className="ti ti-arrow-left" aria-hidden="true" />
      Companies
    </Link>
  );

  if (loading) {
    return (
      <PageFrame>
        <LoadingBlocks rows={3} label="Loading company" />
      </PageFrame>
    );
  }

  if (notFound || !company) {
    return (
      <PageFrame>
        <EmptyState
          title="We couldn't find that company"
          action={
            <Link href="/companies" className={buttonClasses({ variant: "secondary" })}>
              Back to companies
            </Link>
          }
        >
          It may have been deleted.
        </EmptyState>
      </PageFrame>
    );
  }

  const ago = timeAgo(company.updatedAt, new Date());
  const updated = ago === "Today" || ago === "Yesterday" ? ago.toLowerCase() : ago;

  return (
    <PageFrame>
      <Toast {...toastProps} />
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

      <header className="pt-2 mb-10">
        <div className="mb-3">{back}</div>
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            aria-label={company.logoUrl ? "Change logo" : "Upload a logo"}
            className="relative shrink-0 mt-1 rounded-stamp group"
          >
            <Monogram name={company.name} logoUrl={company.logoUrl} size="lg" />
            <span className="absolute inset-0 rounded-stamp bg-ink/50 text-canvas opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-100 flex items-center justify-center">
              <i className={`ti ${uploadingLogo ? "ti-loader-2 animate-spin" : "ti-upload"}`} aria-hidden="true" />
            </span>
          </button>
          <div className="flex-1 min-w-0 -ml-3">
            <h1 className="sr-only">{company.name}</h1>
            <EditableField
              value={company.name}
              label="Company name"
              onSave={(v) => {
                if (v.trim()) {
                  save({ name: v.trim() });
                  showToast("Name updated");
                }
              }}
              placeholder="Company name"
              className="font-serif text-title font-semibold"
            />
            <p className="mt-1 pl-3 text-meta text-ink-muted">Updated {updated}</p>
          </div>
          <Menu
            items={[
              { label: company.logoUrl ? "Change logo" : "Upload a logo", icon: "ti-photo", onSelect: () => logoInputRef.current?.click() },
              { label: "Delete company", icon: "ti-trash", danger: true, onSelect: () => setDeleteConfirm(true) },
            ]}
          />
        </div>
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <Button variant="secondary" icon="ti-wand" loading={filling} loadingLabel="Filling in…" onClick={handleAutoFill}>
            Fill in with AI
          </Button>
          <span className="text-meta text-ink-soft">Drafts the research notes from what&apos;s public. You can edit every line.</span>
        </div>
        {fillError && (
          <InlineMessage tone="caution" role="alert" className="mt-4">
            {fillError}
          </InlineMessage>
        )}
      </header>

      <div className="space-y-12">
        <Section title="Linked role" serif id="linked">
          {linkedJob ? (
            <Link
              href={`/applications/${linkedJob.id}`}
              className="group flex items-center gap-3 py-3 px-3 -mx-3 rounded-field hover:bg-well transition-colors duration-100"
            >
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink">{linkedJob.title}</span>
                <span className="block text-meta text-ink-soft">{linkedJob.company}</span>
              </span>
              <span className="text-ui font-semibold text-action">Open job</span>
              <i className="ti ti-arrow-right text-action" aria-hidden="true" />
            </Link>
          ) : (
            <p className="text-ink-soft">No role is linked to this company.</p>
          )}
        </Section>

        <Section title="Research notes" serif id="notes">
          <dl className="space-y-6">
            {PROFILE_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <dt className="mb-1 text-label font-semibold text-ink-soft">{label}</dt>
                <dd className="-mx-3">
                  <EditableField
                    value={company[key] as string | null}
                    label={label}
                    placeholder={placeholder}
                    multiline
                    rows={3}
                    onSave={(v) => {
                      save({ [key]: v.trim() || null });
                      showToast("Saved");
                    }}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      {deleteConfirm && (
        <Dialog
          title={`Delete ${company.name}?`}
          description="Its research notes go too. Any jobs stay where they are. This can't be undone."
          onRequestClose={() => setDeleteConfirm(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger-solid" loading={deleting} loadingLabel="Deleting…" onClick={handleDelete}>
                Delete company
              </Button>
            </>
          }
        />
      )}
    </PageFrame>
  );
}
