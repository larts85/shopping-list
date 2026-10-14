import CatalogRequests from "@/app/ui/catalog/catalogRequests";
import Suggestions from "@/app/ui/list/suggestions";
export default function Page() {
  return (
    <div className="space-y-6">
      <CatalogRequests />
      <Suggestions />
    </div>
  );
}

Page.displayName = 'Page';
