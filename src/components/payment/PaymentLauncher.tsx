"use client";

import { useState } from "react";
import PaymentModal from "./PaymentModal";

export default function PaymentLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-gradient rounded-xl px-5 py-3 font-bold text-white">
        เปิดหน้าชำระเงิน
      </button>
      <PaymentModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
