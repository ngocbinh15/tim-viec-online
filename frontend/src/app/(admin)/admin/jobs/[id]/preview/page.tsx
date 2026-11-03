import { AdminContent } from "../../../_components/admin-content";

export default function LegacyJobPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <AdminContent section="jobs" params={params} legacyPreview />;
}
