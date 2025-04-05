"use client";

import dynamic from "next/dynamic";

// note: dynamic import is required for components that use the Frame SDK
const PixelBattleApp = dynamic(() => import("~/components/PixelBattleApp"), {
  ssr: false,
});

export default function App(
  { title }: { title?: string } = { title: process.env.NEXT_PUBLIC_FRAME_NAME || "Pixel Battle" }
) {
  return <PixelBattleApp />;
}
