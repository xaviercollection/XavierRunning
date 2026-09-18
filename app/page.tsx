import { ExperienceShell } from "@/components/ExperienceShell";
import { StoreShowcase } from "@/components/store/StoreShowcase";
import { SiteFooter } from "@/components/footer/SiteFooter";

export default function Home() {
  return (
    <ExperienceShell
      storeShowcase={<StoreShowcase />}
      footer={<SiteFooter />}
    />
  );
}