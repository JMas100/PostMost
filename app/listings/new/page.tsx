import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/sidebar";
import { ListingForm } from "@/components/listing-form";

export default async function NewListingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold">Create listing</h1>
        <ListingForm />
      </div>
    </Shell>
  );
}
