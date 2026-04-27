import { NextResponse } from "next/server";
import { createCarousel, addSlide, deleteCarousel } from "@/lib/carousels";
import { exportAllSlides } from "@/lib/export-slides";
import type { AspectRatio } from "@/types/carousel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

interface SlideInput {
  html: string;
  notes?: string;
}

interface RenderRequest {
  title?: string;
  aspectRatio?: AspectRatio;
  slides: SlideInput[];
  persist?: boolean; // default true — keep carousel in storage after render
}

export async function POST(request: Request) {
  let carouselId: string | null = null;

  try {
    const body: RenderRequest = await request.json();

    const { title = "Headless Render", aspectRatio = "4:5", slides, persist = true } = body;

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "slides array is required and must not be empty" }, { status: 400 });
    }

    if (!["1:1", "4:5", "9:16"].includes(aspectRatio)) {
      return NextResponse.json({ error: "aspectRatio must be one of: 1:1, 4:5, 9:16" }, { status: 400 });
    }

    const carousel = await createCarousel(title, aspectRatio);
    carouselId = carousel.id;

    for (const s of slides) {
      await addSlide(carouselId, s.html, s.notes ?? "");
    }

    // Re-read carousel after adding slides
    const { getCarousel } = await import("@/lib/carousels");
    const populated = await getCarousel(carouselId);
    if (!populated) throw new Error("Carousel disappeared after creation");

    const pngBuffers = await exportAllSlides(populated.slides, aspectRatio);

    const images = pngBuffers.map(({ name, buffer }) => ({
      filename: name,
      base64: buffer.toString("base64"),
    }));

    if (!persist) {
      await deleteCarousel(carouselId);
      carouselId = null;
    }

    return NextResponse.json({
      carouselId: persist ? populated.id : null,
      title,
      aspectRatio,
      slideCount: images.length,
      images,
    });
  } catch (error) {
    // Clean up on error if carousel was created and persist was not requested
    if (carouselId) {
      try { await deleteCarousel(carouselId); } catch { /* ignore */ }
    }
    console.error("Headless render error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Render failed: ${message}` }, { status: 500 });
  }
}
