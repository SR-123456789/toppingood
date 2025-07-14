"use client";

import { useEffect } from "react";

export default function DisableZoom() {
  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    const isNativeApp = /ToppifyNativeApp/i.test(userAgent);

    if (isNativeApp) {
      const metaTag = document.createElement("meta");
      metaTag.name = "viewport";
      metaTag.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
      document.head.appendChild(metaTag);
    }
  }, []);

  return null;
}
