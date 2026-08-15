"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importCSV } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

const SAMPLE_CSV = `title,description,price,quantity,condition,category,brand,size,color,photos
Vintage Denim Jacket,Blue denim jacket in great condition,24.99,1,Used,Jackets,Levi's,M,Blue,https://example.com/jacket1.jpg
Nike Air Max 90,Comfortable running shoes,45.00,1,New,Shoes,Nike,10,Black,https://example.com/shoe1.jpg`;

export function CsvImporter() {
  const [fileName, setFileName] = useState<string>("");
  const [csvText, setCsvText] = useState<string>("");
  const [publish, setPublish] = useState<boolean>(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof importCSV>> | null>(null);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setResult(null);
      setError("");
    };
    reader.readAsText(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!csvText.trim()) {
      setError("Please select a CSV file first.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await importCSV(csvText, { publish });
        setResult(res);
        if (res.created > 0 || res.drafted > 0) {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "postmost-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasErrors = result && result.errors.length > 0;
  const hasSuccess = result && (result.created > 0 || result.drafted > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload CSV</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV file</label>
            <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isPending} />
            {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Import mode</label>
            <select
              value={publish ? "publish" : "draft"}
              onChange={(e) => setPublish(e.target.value === "publish")}
              disabled={isPending}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="draft">Import as drafts</option>
              <option value="publish">Publish immediately (requires all required fields)</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {hasSuccess && (
            <div className="flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 p-3 text-sm">
              <CheckCircle className="h-4 w-4" />
              Created {result.created} published listing{result.created !== 1 && "s"} and{" "}
              {result.drafted} draft{result.drafted !== 1 && "s"}.
            </div>
          )}

          {hasErrors && (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">{result.errors.length} row(s) failed</p>
              <ul className="max-h-40 space-y-1 overflow-auto text-muted-foreground">
                {result.errors.slice(0, 20).map((err, i) => (
                  <li key={i}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending || !csvText}>
              <Upload className="mr-2 h-4 w-4" />
              {isPending ? "Importing..." : "Import"}
            </Button>
            <Button type="button" variant="outline" onClick={downloadSample} disabled={isPending}>
              Download sample CSV
            </Button>
          </div>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-medium">Expected columns</p>
          <p className="mt-1">
            title, description, price, quantity, condition, category, brand, size, color, material, sku, tags, photos
          </p>
          <p className="mt-2">
            Use <code>photo1</code>, <code>photo2</code> columns, or a single <code>photos</code> column with URLs separated by <code>|</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
