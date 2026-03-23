"use client";

import { useState, useEffect } from "react";
import { MOBILE_BREAKPOINT } from "@/lib/frames";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
  }, []);

  return isMobile;
}
