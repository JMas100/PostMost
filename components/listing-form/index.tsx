"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldErrors, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listingSchema, ListingFormData } from "@/lib/schemas/listing";
import { createListing, saveDraft, publishDraft } from "@/lib/actions/listings";
import { crossPost } from "@/lib/actions/crosspost";
import { saveTemplate } from "@/lib/actions/templates";
import { generateListingFromPhoto } from "@/lib/actions/ai-generate";
import {
  optimizeTitle,
  optimizeDescription,
  suggestPrice,
  generatePlatformCaption,
  enhancePhoto,
  formatPhoto,
  isStudioRemovalAvailable,
} from "@/lib/actions/ai-enhance";
import { BgRemovalTier } from "@/lib/plans";
import { DEFAULT_PHOTO_PRESET, PhotoBackground } from "@/lib/images/presets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { uploadDataUrl, uploadImages } from "@/lib/upload-client";
import { computeInitialStep, isPhotoUrl, ListingFormProps, OptimizingState, STEP_FIELDS, STEP_LABELS, STEPS } from "./types";
import { useListingWizard } from "./use-listing-wizard";
import { WizardStepper } from "./wizard-stepper";
import { WizardNav } from "./wizard-nav";
import { StepPhotos } from "./step-photos";
import { StepDetails } from "./step-details";
import { StepPricing } from "./step-pricing";
import { StepReview } from "./step-review";

export function ListingForm({ mode = "create", draftId, initialData, templates = [], defaultTemplateId = "", shippingProfiles = [], accounts = [] }: ListingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialData?.photos?.length ? initialData.photos : [""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplateId);
  const [enhancingUrls, setEnhancingUrls] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [background, setBackground] = useState<PhotoBackground>("transparent");
  const [preset, setPreset] = useState<string>(DEFAULT_PHOTO_PRESET);
  const [studioAvailable, setStudioAvailable] = useState(false);

  const connectedPlatforms = accounts.map((a) => a.platform);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(() => new Set(connectedPlatforms));
  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  const [optimizing, setOptimizing] = useState<OptimizingState>("");
  const [selectedCaptionPlatform, setSelectedCaptionPlatform] = useState<string>("");
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);
  const [captionPreview, setCaptionPreview] = useState<{ title: string; description: string } | null>(null);

  const defaultValues: Partial<ListingFormData> = {
    condition: "Good",
    category: "Clothing",
    quantity: 1,
    photos: [],
    shippingProfileId: initialData?.shippingProfileId ?? null,
    ...initialData,
  };

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues,
  });
  const { handleSubmit, setValue, getValues, reset, trigger, formState: { isSubmitting } } = form;

  const wizard = useListingWizard(computeInitialStep(initialData));

  useEffect(() => {
    const validPhotos = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    setValue("photos", validPhotos, { shouldValidate: true });
  }, [photoUrls, setValue]);

  useEffect(() => {
    isStudioRemovalAvailable().then(setStudioAvailable).catch(() => setStudioAvailable(false));
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        try {
          const payload = JSON.parse(template.payload) as ListingFormData;
          reset({
            ...payload,
            photos: payload.photos || [],
          });
          // Resetting local state to match an externally-selected template, not deriving
          // state from props during render — an effect is the right place for this.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPhotoUrls(payload.photos?.length ? payload.photos : [""]);
          wizard.resetTo(computeInitialStep(payload));
          toast.success(`Loaded template: ${template.name}`);
        } catch {
          toast.error("Failed to load template");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, templates, reset]);

  function addPhotoField() {
    setPhotoUrls([...photoUrls, ""]);
  }

  function updatePhoto(index: number, value: string) {
    const next = [...photoUrls];
    next[index] = value;
    setPhotoUrls(next);
  }

  function removePhoto(index: number) {
    const next = photoUrls.filter((_, i) => i !== index);
    setPhotoUrls(next.length ? next : [""]);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const urls = await uploadImages(Array.from(files));
      setPhotoUrls((prev) => [...prev.filter((u) => u.trim() !== ""), ...urls]);
      toast.success(urls.length > 1 ? `${urls.length} photos uploaded` : "Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photos");
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function analyzeWithAI() {
    const firstImage = photoUrls.find(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    if (!firstImage) {
      toast.error("Upload or paste a photo first");
      return;
    }

    setAnalyzing(true);
    try {
      const result = await generateListingFromPhoto(firstImage);
      if (!result.success || !result.listing) {
        toast.error(result.error || "AI analysis failed");
        return;
      }
      const l = result.listing;
      setValue("title", l.title, { shouldValidate: true });
      setValue("description", l.description, { shouldValidate: true });
      setValue("price", l.price, { shouldValidate: true });
      setValue("quantity", l.quantity, { shouldValidate: true });
      setValue("condition", l.condition, { shouldValidate: true });
      setValue("category", l.category, { shouldValidate: true });
      if (l.brand) setValue("brand", l.brand);
      if (l.size) setValue("size", l.size);
      if (l.color) setValue("color", l.color);
      if (l.material) setValue("material", l.material);
      toast.success("Listing fields filled from photo");
      wizard.goNextStep();
    } catch (err) {
      toast.error("Failed to analyze image");
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleOptimizeTitle() {
    const title = getValues("title");
    const category = getValues("category");
    if (!title) return toast.error("Add a title first");
    setOptimizing("title");
    try {
      const result = await optimizeTitle({ title, category });
      if (!result.success) {
        toast.error(result.error || "Optimization failed");
        return;
      }
      setValue("title", result.result, { shouldValidate: true });
      toast.success("Title optimized");
    } finally {
      setOptimizing("");
    }
  }

  async function handleOptimizeDescription() {
    const description = getValues("description");
    const category = getValues("category");
    if (!description) return toast.error("Add a description first");
    setOptimizing("description");
    try {
      const result = await optimizeDescription({ description, category });
      if (!result.success) {
        toast.error(result.error || "Optimization failed");
        return;
      }
      setValue("description", result.result, { shouldValidate: true });
      toast.success("Description optimized");
    } finally {
      setOptimizing("");
    }
  }

  async function handleSuggestPrice() {
    const firstImage = photoUrls.find((u) => u.startsWith("http") || u.startsWith("data:"));
    const title = getValues("title");
    const category = getValues("category");
    const condition = getValues("condition");
    if (!title) return toast.error("Add a title first");
    setOptimizing("price");
    try {
      const result = await suggestPrice({ imageBase64: firstImage, title, category, condition });
      if (!result.success) {
        toast.error(result.error || "Pricing suggestion failed");
        return;
      }
      setValue("price", result.result.price, { shouldValidate: true });
      toast.success(`Suggested price: $${result.result.price.toFixed(2)}`);
    } finally {
      setOptimizing("");
    }
  }

  async function removeBackgroundFor(
    image: string,
    tier: BgRemovalTier
  ): Promise<
    | { ok: true; url: string; tier: BgRemovalTier }
    | { ok: false; error: string; code?: "quota" | "auth" }
  > {
    const result = await enhancePhoto(image, { tier, format: { background, preset } });
    if (!result.success) {
      return { ok: false, error: result.error || "Photo enhancement failed", code: result.code };
    }
    const url = result.result.startsWith("data:") ? await uploadDataUrl(result.result) : result.result;
    return { ok: true, url, tier: result.tier };
  }

  /**
   * Runs a per-photo operation over every photo sequentially, applying whatever succeeded even if
   * some photos failed. `code` on a failure means the rest would fail the same way, so it stops.
   */
  async function runOnAllPhotos(
    label: string,
    run: (image: string) => Promise<{ ok: true; url: string } | { ok: false; error: string; code?: string }>
  ): Promise<{ done: number; total: number; failures: string[] }> {
    // Deduped: replacements are keyed by URL, so a repeated photo is processed (and billed) once.
    const targets = Array.from(new Set(photoUrls.filter(isPhotoUrl)));
    const replacements = new Map<string, string>();
    const failures: string[] = [];

    setOptimizing("photo");
    setEnhancingUrls(targets);
    setBatchProgress({ label, done: 0, total: targets.length });

    try {
      for (const image of targets) {
        let stop = false;
        try {
          const outcome = await run(image);
          if (outcome.ok) replacements.set(image, outcome.url);
          else {
            failures.push(outcome.error);
            stop = !!outcome.code;
          }
        } catch (err) {
          failures.push(err instanceof Error ? err.message : "Failed to save photo");
        }
        setEnhancingUrls((prev) => prev.filter((u) => u !== image));
        setBatchProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
        if (stop) break;
      }

      if (replacements.size > 0) {
        setPhotoUrls((prev) => prev.map((u) => replacements.get(u) ?? u));
      }
      return { done: replacements.size, total: targets.length, failures };
    } finally {
      setOptimizing("");
      setEnhancingUrls([]);
      setBatchProgress(null);
    }
  }

  async function handleEnhancePhoto(index: number, tier: BgRemovalTier = "standard") {
    const image = photoUrls[index];
    if (!image || !isPhotoUrl(image)) {
      return toast.error("Upload a photo first");
    }
    setOptimizing("photo");
    setEnhancingUrls([image]);
    try {
      const outcome = await removeBackgroundFor(image, tier);
      if (!outcome.ok) {
        toast.error(outcome.error);
        return;
      }
      if (tier === "studio" && outcome.tier === "standard") {
        toast.warning("Studio quality is unavailable right now — used standard removal instead");
      }
      const next = [...photoUrls];
      next[index] = outcome.url;
      setPhotoUrls(next);
      toast.success(outcome.tier === "studio" ? "Photo enhanced (studio quality)" : "Photo enhanced");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save enhanced photo");
      console.error(err);
    } finally {
      setOptimizing("");
      setEnhancingUrls([]);
    }
  }

  async function handleEnhanceAllPhotos(tier: BgRemovalTier = "standard") {
    if (photoUrls.filter(isPhotoUrl).length === 0) return toast.error("Upload a photo first");

    let degraded = 0;
    // Sequential: each photo is billed and quota-checked server-side on its own, and a shared
    // provider is friendlier to one request at a time than to a burst.
    const { done, total, failures } = await runOnAllPhotos("Removing backgrounds…", async (image) => {
      const outcome = await removeBackgroundFor(image, tier);
      if (outcome.ok && tier === "studio" && outcome.tier === "standard") degraded++;
      return outcome;
    });

    if (done > 0) {
      toast.success(
        done === total
          ? `Removed background on ${total} photo${total === 1 ? "" : "s"}`
          : `Removed background on ${done} of ${total} photos`
      );
    }
    if (degraded > 0) {
      toast.warning(`Studio quality is unavailable right now — used standard removal on ${degraded} photo${degraded === 1 ? "" : "s"}`);
    }
    if (failures.length > 0) toast.error(failures[0]);
  }

  async function handleFormatAllPhotos() {
    if (photoUrls.filter(isPhotoUrl).length === 0) return toast.error("Upload a photo first");

    const { done, total, failures } = await runOnAllPhotos("Applying finish…", async (image) => {
      const result = await formatPhoto(image, { background, preset });
      if (!result.success) return { ok: false as const, error: result.error, code: result.code };
      return { ok: true as const, url: await uploadDataUrl(result.result) };
    });

    if (done > 0) {
      toast.success(done === total ? `Updated ${total} photo${total === 1 ? "" : "s"}` : `Updated ${done} of ${total} photos`);
    }
    if (failures.length > 0) toast.error(failures[0]);
  }

  async function handleGenerateCaption() {
    const title = getValues("title");
    const description = getValues("description");
    const platform = selectedCaptionPlatform;
    if (!title || !description) return toast.error("Add a title and description first");
    if (!platform) return toast.error("Select a marketplace first");
    const brand = getValues("brand");
    const size = getValues("size");
    const color = getValues("color");
    const material = getValues("material");
    const condition = getValues("condition");
    setOptimizing("caption");
    try {
      const result = await generatePlatformCaption({ title, description, platform, brand, size, color, material, condition });
      if (!result.success) {
        toast.error(result.error || "Caption generation failed");
        return;
      }
      setCaptionPreview(result.result);
      setCaptionDialogOpen(true);
    } finally {
      setOptimizing("");
    }
  }

  function applyCaption() {
    if (!captionPreview) return;
    setValue("title", captionPreview.title, { shouldValidate: true });
    setValue("description", captionPreview.description, { shouldValidate: true });
    setCaptionDialogOpen(false);
    toast.success("Caption applied");
  }

  function getCleanValues() {
    const values = getValues();
    const valid = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    return { ...values, photos: valid.length > 0 ? valid : undefined } as Partial<ListingFormData>;
  }

  async function onSaveDraft() {
    setSaving(true);
    try {
      const result = await saveDraft(getCleanValues(), draftId);
      if (result && "error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to save draft");
        return;
      }
      toast.success("Draft saved");
      if (!draftId && result && "listing" in result && result.listing) {
        router.push(`/listings/${result.listing.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error("Failed to save draft");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function onSaveTemplate() {
    const name = templateName.trim() || "Untitled template";
    const result = await saveTemplate(name, getCleanValues());
    if ("error" in result && result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Failed to save template");
      return;
    }
    toast.success("Template saved");
    setTemplateName("");
    router.refresh();
  }

  async function onSubmit(data: ListingFormData) {
    if (wizard.currentStep !== "review") return;

    const validPhotos = photoUrls.filter(
      (u) => u.trim().startsWith("http") || u.trim().startsWith("data:")
    );
    if (validPhotos.length === 0) {
      toast.error("Add at least one valid photo");
      return;
    }

    if (mode === "draft" && draftId) {
      const result = await publishDraft(draftId, { ...data, photos: validPhotos });
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to publish draft");
        console.error(result.error);
        return;
      }
      if (!result.listing) {
        toast.error("Failed to publish draft");
        return;
      }
      const published = await publishToSelectedPlatforms(result.listing.id);
      router.push(`/listings/${result.listing.id}${published.length ? `?published=${published.join(",")}` : ""}`);
      router.refresh();
      return;
    }

    const result = await createListing({ ...data, photos: validPhotos });
    if (result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Failed to create listing");
      console.error(result.error);
      return;
    }
    if (!result.listing) {
      toast.error("Listing creation failed");
      return;
    }
    const published = await publishToSelectedPlatforms(result.listing.id);
    router.push(`/listings/${result.listing.id}${published.length ? `?published=${published.join(",")}` : ""}`);
    router.refresh();
  }

  /** Folds "create" and "publish" into one action, per the design handoff: the wizard as built
   *  ended at Review with publishing left for the detail page afterward. Reuses crossPost exactly
   *  as the detail page's Publish panel does -- no new backend needed. A failure here doesn't
   *  block the redirect: the listing was already created successfully, so the user lands on its
   *  detail page (where the Publish panel can retry) rather than losing the listing they just made.
   *  Returns the platforms actually queued, so the caller can carry them into the redirect and
   *  trigger the same "watched live" payoff dialog the detail page's own Publish click shows. */
  async function publishToSelectedPlatforms(listingId: string): Promise<string[]> {
    if (selectedPlatforms.size === 0) {
      toast.success(mode === "draft" ? "Draft published" : "Listing created");
      return [];
    }
    const platforms = Array.from(selectedPlatforms);
    const result = await crossPost(listingId, platforms);
    if (result.error) {
      toast.error(`Listing created, but publishing failed: ${result.error}`);
      return [];
    }
    return platforms;
  }

  function onInvalid(invalidErrors: FieldErrors<ListingFormData>) {
    const erroredFields = Object.keys(invalidErrors);
    const stepWithError = STEPS.find((step) => STEP_FIELDS[step].some((f) => erroredFields.includes(f)));
    if (stepWithError) {
      wizard.goToStep(stepWithError);
      toast.error("Please fix the highlighted fields");
    }
  }

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[wizard.currentStep]);
    if (valid) wizard.goNextStep();
  }

  const navDisabled = !!optimizing || analyzing;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>{mode === "draft" ? "Edit draft" : "Create new listing"}</CardTitle>
        <WizardStepper
          currentStep={wizard.currentStep}
          maxStepReached={wizard.maxStepReached}
          onJump={wizard.goToStep}
          disabled={navDisabled}
        />
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {wizard.currentStep === "photos" && (
              <StepPhotos
                fileInputRef={fileInputRef}
                photoUrls={photoUrls}
                setPhotoUrls={setPhotoUrls}
                uploading={uploading}
                analyzing={analyzing}
                optimizing={optimizing}
                onFileChange={handleFileChange}
                onAddPhotoField={addPhotoField}
                onUpdatePhoto={updatePhoto}
                onRemovePhoto={removePhoto}
                onAnalyzeWithAI={analyzeWithAI}
                onEnhancePhoto={handleEnhancePhoto}
                onEnhanceAllPhotos={handleEnhanceAllPhotos}
                onFormatAllPhotos={handleFormatAllPhotos}
                background={background}
                onBackgroundChange={setBackground}
                preset={preset}
                onPresetChange={setPreset}
                enhancingUrls={enhancingUrls}
                batchProgress={batchProgress}
                studioAvailable={studioAvailable}
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
                onSkipToNext={goNext}
              />
            )}
            {wizard.currentStep === "details" && (
              <StepDetails optimizing={optimizing} onOptimizeTitle={handleOptimizeTitle} onOptimizeDescription={handleOptimizeDescription} />
            )}
            {wizard.currentStep === "pricing" && (
              <StepPricing optimizing={optimizing} onSuggestPrice={handleSuggestPrice} shippingProfiles={shippingProfiles} />
            )}
            {wizard.currentStep === "review" && (
              <StepReview
                photoUrls={photoUrls}
                optimizing={optimizing}
                selectedCaptionPlatform={selectedCaptionPlatform}
                onSelectCaptionPlatform={setSelectedCaptionPlatform}
                onGenerateCaption={handleGenerateCaption}
                captionDialogOpen={captionDialogOpen}
                onCaptionDialogOpenChange={setCaptionDialogOpen}
                captionPreview={captionPreview}
                onApplyCaption={applyCaption}
                templateName={templateName}
                onTemplateNameChange={setTemplateName}
                onSaveTemplate={onSaveTemplate}
                connectedPlatforms={connectedPlatforms}
                selectedPlatforms={selectedPlatforms}
                onTogglePlatform={togglePlatform}
              />
            )}

            <WizardNav
              isFirst={wizard.isFirst}
              isLast={wizard.isLast}
              onBack={wizard.goBack}
              onNext={goNext}
              onSubmitClick={handleSubmit(onSubmit, onInvalid)}
              onSaveDraft={onSaveDraft}
              saving={saving}
              submitLabel={
                selectedPlatforms.size > 0
                  ? `Publish to ${selectedPlatforms.size} marketplace${selectedPlatforms.size === 1 ? "" : "s"}`
                  : mode === "draft"
                    ? "Publish draft"
                    : "Create listing"
              }
              isSubmitting={isSubmitting}
              navDisabled={navDisabled}
              nextStepLabel={STEP_LABELS[STEPS[STEPS.indexOf(wizard.currentStep) + 1]]}
            />
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
