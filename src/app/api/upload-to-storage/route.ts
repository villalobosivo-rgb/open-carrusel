import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface UploadImage {
  base64: string;
  filename?: string;
}

interface UploadRequest {
  images: UploadImage[];
  carouselId?: string;
  supabaseUrl: string;
  supabaseKey: string;
  bucket?: string;
}

export async function POST(request: Request) {
  try {
    const body: UploadRequest = await request.json();
    const { images, carouselId, supabaseUrl, supabaseKey, bucket = "revenight-images" } = body;

    if (!images?.length || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "images, supabaseUrl, and supabaseKey are required" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const imageUrls: string[] = [];
    const uploadErrors: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const path = `carousel/${timestamp}/slide-${i + 1}.png`;
      const buffer = Buffer.from(img.base64, "base64");

      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            "Content-Type": "image/png",
            "x-upsert": "true",
          },
          body: buffer,
        }
      );

      if (!response.ok) {
        const err = await response.text();
        const msg = `slide${i + 1}: HTTP ${response.status} — ${err.slice(0, 300)}`;
        console.error(`[upload-to-storage] ${msg}`);
        uploadErrors.push(msg);
      } else {
        imageUrls.push(
          `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
        );
      }
    }

    return NextResponse.json({ imageUrls, carouselId, uploadErrors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
