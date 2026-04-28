import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";

// Temporary debug endpoint — reveals filesystem state inside the container.
// DELETE this file before shipping to production.
export async function GET() {
  const cwd = process.cwd();
  const tmpUploads = "/tmp/uploads";
  const cwdUploads = path.join(cwd, "public", "uploads");

  async function listDir(dir: string) {
    try {
      const files = await readdir(dir);
      return { exists: true, files: files.slice(0, 20) };
    } catch {
      return { exists: false, files: [] };
    }
  }

  async function dirStat(dir: string) {
    try {
      const s = await stat(dir);
      return { exists: true, isDir: s.isDirectory(), size: s.size };
    } catch {
      return { exists: false };
    }
  }

  const [tmpList, cwdList, tmpStat, cwdStat] = await Promise.all([
    listDir(tmpUploads),
    listDir(cwdUploads),
    dirStat(tmpUploads),
    dirStat(cwdUploads),
  ]);

  return NextResponse.json({
    cwd,
    tmpUploads: { path: tmpUploads, stat: tmpStat, ...tmpList },
    cwdUploads: { path: cwdUploads, stat: cwdStat, ...cwdList },
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
  });
}
