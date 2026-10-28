"use client";

import { useState } from "react";
import { Lightbulb, X } from "lucide-react";

export default function IncomeGuideModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2.5 text-base font-semibold text-slate-200 transition-all hover:bg-white/10 hover:text-white"
      >
        <Lightbulb className="mr-1.5 inline h-4 w-4 text-amber-500" />
        คู่มือสร้างรายได้
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="income-guide-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-panel relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-space-border bg-[#06030c]/95 p-6 text-slate-100 shadow-2xl backdrop-blur-xl lg:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดคู่มือสร้างรายได้"
              className="absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-10">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-300">SurpriseQR Guide</p>
              <h2 id="income-guide-title" className="mt-2 text-2xl font-black text-white lg:text-3xl">
                คู่มือสร้างรายได้จากการสร้างการ์ด
              </h2>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold text-white">วิธีสร้างรายได้</h3>
              <ul className="mt-3 list-disc space-y-3 pl-5 text-base font-medium leading-6 text-slate-300">
                <li>หาฐานลูกค้ากลุ่มเป้าหมาย ในโซเชียลมิเดียต่างๆ เช่น tiktok ,facebook อื่นๆ</li>
                <li>นำเสนอและเสนอขาย: แสดงผลงานและนำเสนอบริการรับสร้างการ์ดแก่ลูกค้า</li>
                <li>วางแผนการใช้งานเพื่อทำกำไรสูงสุด</li>
              </ul>

              <section className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
                <p className="text-base font-bold text-white">ตัวอย่างการคำนวณกำไร (แพ็คเกจ คุ้มค่า 119 บาท):</p>
                <div className="mt-2 space-y-1 text-base font-medium leading-6 text-slate-300">
                  <p>ได้ 8 เทมเพลต (ต้นทุน ~15 บาท/งาน)</p>
                  <p>รับงานลูกค้า 29 บาท x 8 ใบ = 232 บาท (กำไร 113 บาท)</p>
                  <p>รับงาน 49 บาท x 8 ใบ = 392 บาท (กำไร 273 บาท)</p>
                </div>
              </section>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-gradient mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-base font-bold text-white"
            >
              กลับ
            </button>
          </div>
        </div>
      )}
    </>
  );
}
