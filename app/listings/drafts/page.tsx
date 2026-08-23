import { redirect } from "next/navigation";

export default function DraftsPage() {
  redirect("/listings?tab=drafts");
}
