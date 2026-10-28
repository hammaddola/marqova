import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PreviewNotice } from "@/components/layout/preview-notice";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PreviewNotice />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <AssistantWidget />
    </>
  );
}
