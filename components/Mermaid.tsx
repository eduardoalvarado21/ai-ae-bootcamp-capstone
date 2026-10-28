"use client";

import { useEffect, useRef, useState } from "react";

/** Renders a Mermaid diagram client-side. */
export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;
    const id = `mmd-${Math.random().toString(36).slice(2)}`;
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
      mermaid
        .render(id, chart)
        .then(({ svg }) => {
          if (active) setSvg(svg);
        })
        .catch(() => {
          if (active) setSvg("");
        });
    });
    return () => {
      active = false;
    };
  }, [chart]);

  return (
    <div
      ref={ref}
      className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
