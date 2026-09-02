"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  confirmMemberImport,
  previewMemberImport,
  type ImportPreview,
  type ImportSummary,
} from "@/features/members/actions/import-members";
import type { ActionResult } from "@/lib/errors";
import { formatNumber } from "@/lib/format";

const TEMPLATE_HEADER =
  "nama_lengkap,nomor_anggota,jenis_kelamin,tempat_lahir,tanggal_lahir,email,telepon,alamat,tanggal_bergabung,status,catatan";

export function MemberImport({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [readError, setReadError] = useState<string | null>(null);

  const [previewState, previewAction] = useActionState<
    ActionResult<ImportPreview> | null,
    FormData
  >(previewMemberImport.bind(null, organizationId), null);

  const [confirmState, confirmAction] = useActionState<
    ActionResult<ImportSummary> | null,
    FormData
  >(confirmMemberImport.bind(null, organizationId), null);

  useEffect(() => {
    if (confirmState?.success) {
      showToast(`${formatNumber(confirmState.data.inserted)} anggota diimpor.`);
      router.push("/anggota");
    }
  }, [confirmState, router, showToast]);

  async function handleFile(file: File) {
    setReadError(null);
    setFileName(file.name);

    if (file.size > 2 * 1024 * 1024) {
      setReadError("Berkas terlalu besar. Maksimal 2 MB.");
      setCsvText("");
      return;
    }

    try {
      setCsvText(await file.text());
    } catch {
      setReadError("Berkas tidak dapat dibaca.");
      setCsvText("");
    }
  }

  function downloadTemplate() {
    const blob = new Blob([`﻿${TEMPLATE_HEADER}\r\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "template-anggota.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const preview = previewState?.success ? previewState.data : null;
  const previewFailed =
    previewState && !previewState.success ? previewState : null;
  const confirmFailed =
    confirmState && !confirmState.success ? confirmState : null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>1. Pilih Berkas</CardTitle>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <FileUp size={14} aria-hidden="true" />
            Unduh template
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Format CSV. Kolom yang dikenali: nama lengkap (wajib), nomor
            anggota, jenis kelamin, tempat &amp; tanggal lahir, email, telepon,
            alamat, tanggal bergabung, status, catatan. Kolom lain diabaikan.
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Berkas CSV anggota"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="block w-full text-[13px] text-muted-foreground file:mr-3 file:h-[46px] min-[480px]:file:h-11 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-card file:px-4 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />

          <FormAlert message={readError ?? undefined} />

          {csvText ? (
            <form action={previewAction}>
              <input type="hidden" name="csv" value={csvText} />
              <SubmitButton pendingLabel="Memeriksa…">
                <Upload size={16} aria-hidden="true" />
                Periksa Berkas
              </SubmitButton>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <FormAlert message={previewFailed?.error} />

      {preview ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>2. Pratinjau</CardTitle>
              <span className="text-[13px] text-muted-foreground">
                {fileName}
              </span>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Total baris" value={preview.totalRows} />
                <Stat
                  label="Siap diimpor"
                  value={preview.validRows}
                  tone="success"
                />
                <Stat
                  label="Bermasalah"
                  value={preview.invalidRows}
                  tone="destructive"
                />
                <Stat
                  label="Duplikat"
                  value={preview.duplicateRows}
                  tone="warning"
                />
              </div>

              {preview.unrecognizedColumns.length > 0 ? (
                <p className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                  <AlertTriangle
                    size={16}
                    className="mt-px shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Kolom tidak dikenali dan akan diabaikan:{" "}
                    {preview.unrecognizedColumns.join(", ")}
                  </span>
                </p>
              ) : null}

              {preview.issues.length > 0 ? (
                <div className="rounded-md border border-border">
                  <p className="border-b border-border px-3 py-2 text-[13px] font-medium">
                    Masalah yang ditemukan
                  </p>
                  <ul className="scroll-area max-h-56 divide-y divide-border">
                    {preview.issues.map((issue, index) => (
                      <li
                        key={`${issue.row}-${issue.field}-${index}`}
                        className="px-3 py-2 text-[13px]"
                      >
                        <span className="text-muted-foreground">
                          Baris {issue.row} · {issue.field}:
                        </span>{" "}
                        <span className="text-foreground">{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <TableScroll>
                <Table>
                  <TableHead>
                    <TableRow className="hover:bg-transparent">
                      <TableHeaderCell>Baris</TableHeaderCell>
                      <TableHeaderCell>Nama</TableHeaderCell>
                      <TableHeaderCell>No. Anggota</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Hasil Periksa</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((row) => (
                      <TableRow key={row.row}>
                        <TableCell className="text-muted-foreground">
                          {row.row}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {row.fullName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.memberNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.status}
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge tone="success" dot>
                              Siap
                            </Badge>
                          ) : row.duplicate === "IN_DATABASE" ? (
                            <Badge tone="warning" dot>
                              Sudah ada
                            </Badge>
                          ) : row.duplicate === "IN_FILE" ? (
                            <Badge tone="warning" dot>
                              Ganda di berkas
                            </Badge>
                          ) : (
                            <Badge tone="destructive" dot>
                              Tidak valid
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableScroll>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Konfirmasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormAlert message={confirmFailed?.error} />

              {preview.validRows === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Tidak ada baris yang siap diimpor. Perbaiki berkas lalu
                  periksa ulang.
                </p>
              ) : (
                <>
                  <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
                    <CheckCircle2
                      size={16}
                      className="mt-px shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span>
                      {formatNumber(preview.validRows)} baris akan diimpor ke
                      organisasi aktif.{" "}
                      {preview.invalidRows > 0
                        ? `${formatNumber(preview.invalidRows)} baris bermasalah dilewati.`
                        : ""}{" "}
                      Berkas diperiksa ulang di server sebelum disimpan.
                    </span>
                  </p>

                  <form
                    action={confirmAction}
                    className="flex justify-end gap-2"
                  >
                    <input type="hidden" name="csv" value={csvText} />
                    <Button
                      variant="outline"
                      onClick={() => router.push("/anggota")}
                    >
                      Batal
                    </Button>
                    <SubmitButton pendingLabel="Mengimpor…">
                      Impor {formatNumber(preview.validRows)} Anggota
                    </SubmitButton>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "destructive" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning"
          : "text-foreground";

  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}
