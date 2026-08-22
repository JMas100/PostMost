import { pathToFileURL } from "node:url";
import { createManualAdapter } from "../lib/marketplaces/automation/create-adapter";

async function main() {
  const listingUrl = pathToFileURL("./scripts/test-marketplace.html").href;

  const adapter = createManualAdapter({
    id: "test-marketplace",
    name: "Test Marketplace",
    loginUrl: listingUrl,
    successUrlFragment: "success",
    headless: true,
    delete: {
      deleteSelectors: ["button:has-text('Delete')"],
    },
  });

  const result = await adapter.post(
    {
      title: "Vintage Denim Jacket",
      description: "Great condition vintage denim jacket. Size M.",
      price: 45.0,
      quantity: 1,
      condition: "used_good",
      category: "Clothing",
      photos: [],
    },
    {
      accessToken: "fake-password",
      externalId: "fake-username",
      settings: {},
    }
  );

  console.log(JSON.stringify(result, null, 2));
  if (!result.success) {
    process.exit(1);
  }
}

main();
