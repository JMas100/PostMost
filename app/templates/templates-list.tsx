"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBox, Plus, Trash2 } from "lucide-react";

interface TemplatesListProps {
  templates: { id: string; name: string; payload: string }[];
}

export function TemplatesList({ templates }: TemplatesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <FileBox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No templates yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Save a listing as a template from the create listing page to reuse it later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => {
        let summary = "";
        try {
          const payload = JSON.parse(template.payload) as Record<string, unknown>;
          const keys = Object.keys(payload).filter((k) => k !== "photos" && payload[k]);
          summary = keys.slice(0, 5).join(", ") + (keys.length > 5 ? ", ..." : "");
        } catch {
          summary = "No preview";
        }

        return (
          <Card key={template.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{summary || "No fields saved"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => router.push(`/listings/new?templateId=${template.id}`)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Use template
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTemplate(template.id);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
