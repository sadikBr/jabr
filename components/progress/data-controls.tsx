"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getProgress,
  importProgress,
  resetProgress,
} from "@/lib/progress/store";

/**
 * Export, import and reset. Progress lives only in this browser until
 * accounts exist, so a learner needs a way to keep a copy and to move it.
 */
export function DataControls() {
  const t = useTranslations("progress.data");
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function exportFile() {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${t("fileName")}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    let ok = false;
    try {
      ok = importProgress(JSON.parse(await file.text()));
    } catch {
      // Not JSON at all.
    }
    setMessage(t(ok ? "imported" : "importFailed"));
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
        {t("body")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportFile}>
          <Download aria-hidden="true" />
          {t("export")}
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          <Upload aria-hidden="true" />
          {t("import")}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label={t("import")}
          tabIndex={-1}
          onChange={(event) => importFile(event.target.files?.[0])}
        />
        {confirming ? (
          <>
            <Button
              className="bg-danger text-background hover:bg-danger/90"
              onClick={() => {
                resetProgress();
                setConfirming(false);
                setMessage(t("resetDone"));
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("resetConfirm")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t("resetCancel")}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => {
              setConfirming(true);
              setMessage(null);
            }}
          >
            <Trash2 aria-hidden="true" />
            {t("reset")}
          </Button>
        )}
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm font-medium">
        {message}
      </p>
    </section>
  );
}
