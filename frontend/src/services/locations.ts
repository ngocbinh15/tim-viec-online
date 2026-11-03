import "server-only";
import { cacheLife } from "next/cache";
import { loadProvinceCatalog } from "@/features/locations/provinces";

export async function getProvinceNames(): Promise<string[]> {
  "use cache";
  const catalog = await loadProvinceCatalog();
  if (catalog.source === "api") {
    cacheLife("days");
  } else {
    cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
    console.warn(
      "Province API unavailable; using the verified province snapshot.",
    );
  }
  return catalog.provinces.map((province) => province.name);
}
