import BackButton from "@/components/templates/back-button";
import TemplateShowcase from "@/components/dashboard/template-showcase";
import { getAllTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await getAllTemplates();
  return (
    <main className="min-h-screen w-full bg-transparent font-['Prompt'] text-slate-100">
      <div className="mx-auto w-full max-w-[1800px] px-4 lg:px-6 py-4">
        <div className="mb-6 flex flex-col gap-2">
          <BackButton />
          <div>
            <h1 className="text-2xl font-extrabold text-white md:text-3xl">เทมเพลต</h1>
            <p className="mt-1 text-base font-medium text-slate-300">เลือกเทมเพลตสำหรับการ์ดของคุณ</p>
          </div>
        </div>
        <TemplateShowcase templates={templates} />
      </div>
    </main>
  );
}