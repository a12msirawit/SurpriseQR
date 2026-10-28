"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import CustomQRCode, { type QRFrame, type QRShape } from "./CustomQRCode";

const SHAPES: Array<{ id: QRShape; label: string; icon: string }> = [
  { id: "square", label: "สี่เหลี่ยมปกติ", icon: "▦" },
  { id: "rounded", label: "ทรงมน/วงกลม", icon: "●" },
  { id: "heart", label: "รูปหัวใจ", icon: "♥" },
  { id: "gift", label: "รูปกล่องของขวัญ", icon: "▣" },
  { id: "cake", label: "รูปเค้กวันเกิด", icon: "♜" },
  { id: "star", label: "รูปดาว", icon: "★" },
  { id: "coffee", label: "รูปแก้วกาแฟ", icon: "☕" },
];

const FRAMES: Array<{ id: QRFrame; label: string }> = [
  { id: "none", label: "ไม่มีกรอบ" },
  { id: "rounded", label: "สี่เหลี่ยมขอบมน" },
  { id: "heart", label: "รูปหัวใจ" },
  { id: "circle", label: "วงกลม" },
  { id: "cloud", label: "ก้อนเมฆ" },
  { id: "flower", label: "ดอกไม้" },
  { id: "star", label: "รูปดาว" },
  { id: "phone", label: "โทรศัพท์มือถือ" },
  { id: "shield", label: "รูปโล่" },
  { id: "ticket", label: "ตั๋ว / คูปอง" },
  { id: "minimal", label: "มินิมอล" },
];

interface QRCodeCustomizerProps {
  value: string;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export default function QRCodeCustomizer({ value, svgRef }: QRCodeCustomizerProps) {
  const [shape, setShape] = useState<QRShape>("rounded");
  const [foregroundColor, setForegroundColor] = useState("#111827");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#fb7185");
  const [frameStyle, setFrameStyle] = useState<QRFrame>("rounded");
  const [text, setText] = useState("สแกนเพื่อเปิดการ์ด");
  const [logoUrl, setLogoUrl] = useState<string>();
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setLogoUrl(URL.createObjectURL(file));
  }

  return <div className="glass-panel relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-y-auto rounded-2xl border-space-border bg-[#06030c]/95 text-slate-100 shadow-xl backdrop-blur-xl md:flex-row">
    <div className="flex aspect-square w-full max-w-[360px] shrink-0 items-center justify-center self-center overflow-hidden border-b border-space-border bg-white/5 p-5 md:border-b-0 md:border-r">
      <div className="flex aspect-square min-h-[300px] w-full max-w-[300px] items-center justify-center">
        <CustomQRCode ref={svgRef} value={value} shape={shape} frameStyle={frameStyle} foregroundColor={foregroundColor} backgroundColor={backgroundColor} accentColor={accentColor} text={text} logoUrl={logoUrl} size={300} className="block h-auto w-full" />
      </div>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="space-y-4">
      <fieldset><legend className="mb-2 text-sm font-bold text-slate-200">รูปทรง QR Code</legend><div className="grid grid-cols-2 gap-2">{SHAPES.map((item) => <button key={item.id} type="button" onClick={() => setShape(item.id)} className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition md:min-h-0 ${shape === item.id ? "border-space-accent bg-space-accent/15 text-pink-100" : "border-space-border bg-white/5 text-slate-300 hover:border-space-glow"}`}><span className="mr-1 text-base">{item.icon}</span>{item.label}</button>)}</div></fieldset>
      <fieldset><legend className="mb-2 text-sm font-bold text-slate-200">รูปแบบกรอบ</legend><div className="grid grid-cols-2 gap-2">{FRAMES.map((item) => <button key={item.id} type="button" onClick={() => setFrameStyle(item.id)} className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition md:min-h-0 ${frameStyle === item.id ? "border-space-accent bg-space-accent/15 text-pink-100" : "border-space-border bg-white/5 text-slate-300 hover:border-space-glow"}`}>{item.label}</button>)}</div></fieldset>
      <div className="grid grid-cols-3 gap-2"><label className="text-xs font-semibold text-slate-300">สี QR<input type="color" value={foregroundColor} onChange={(event) => setForegroundColor(event.target.value)} className="mt-1 h-11 min-h-[44px] w-full cursor-pointer rounded-lg border border-space-border bg-white/5 md:h-9" /></label><label className="text-xs font-semibold text-slate-300">สีพื้นหลัง<input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} className="mt-1 h-11 min-h-[44px] w-full cursor-pointer rounded-lg border border-space-border bg-white/5 md:h-9" /></label><label className="text-xs font-semibold text-slate-300">สีกรอบ<input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="mt-1 h-11 min-h-[44px] w-full cursor-pointer rounded-lg border border-space-border bg-white/5 md:h-9" /></label></div>
      <label className="block text-sm font-semibold text-slate-200">ข้อความใต้ QR Code<input value={text} onChange={(event) => setText(event.target.value)} maxLength={48} className="mt-2 w-full rounded-xl border border-space-border bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-space-accent" placeholder="สแกนเพื่อเปิดการ์ด" /></label>
      <div className="flex items-center gap-3">{logoUrl && <img src={logoUrl} alt="ไอคอนกลาง" className="h-12 w-12 rounded-lg border border-space-border object-cover" />}<input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} className="hidden" /><button type="button" onClick={() => logoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-space-border bg-white/10 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-space-glow hover:bg-white/20"><ImagePlus className="h-4 w-4" />{logoUrl ? "เปลี่ยนไอคอน" : "เพิ่มไอคอนกลาง"}</button>{logoUrl && <button type="button" onClick={() => setLogoUrl(undefined)} className="inline-flex items-center gap-2 rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/20"><Trash2 className="h-4 w-4" />ลบไอคอน</button>}</div>
      </div>
    </div>
  </div>;
}
