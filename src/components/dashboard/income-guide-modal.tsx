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
                คู่มือเริ่มรับทำการ์ด
              </h2>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold text-white">เริ่มต้นสร้างรายได้</h3>
              <ul className="mt-3 list-disc space-y-3 pl-5 text-base font-medium leading-6 text-slate-300">
                <li>หาลูกค้าผ่าน TikTok, Facebook, IG และช่องทางอื่น ๆ</li>
                <li>ใช้ผลงานตัวอย่างนำเสนอบริการรับทำการ์ด</li>
                <li>ตั้งราคาให้เหมาะกับงานและต้นทุนของคุณ</li>
              </ul>

              <section className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
                <p className="text-base font-bold text-white">ตัวอย่างคำนวณ (Value Pack ฿119)</p>
                <div className="mt-2 space-y-1 text-base font-medium leading-6 text-slate-300">
                  <p>มีสิทธิ์สร้างการ์ดด้วยเทมเพลตพรีเมียม 3 ครั้ง</p>
                  <p>คิดค่าบริการใบละ ฿49 × 3 ใบ = ฿147</p>
                  <p>เหลือ ฿28 หลังหักราคาแพ็ก*</p>
                  <p className="pt-1 text-sm text-slate-400">*ยังไม่รวมต้นทุนอื่น และราคาค่าบริการเป็นราคาที่คุณกำหนดเอง</p>
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
