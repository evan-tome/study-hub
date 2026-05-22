import { Router } from 'express';

const router = Router();

const ACALOG = 'https://calendar.ontariotechu.ca';
const UA = 'StudyHub/1.0';

// 24-hour cache
let cache: { courses: { code: string; name: string }[]; at: number } | null = null;
const TTL = 24 * 60 * 60 * 1000;

export function getCachedCourseName(code: string): string {
  if (!cache) return code;
  return cache.courses.find((c) => c.code === code)?.name ?? code;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Scrape all course names from the OTU academic calendar (Acalog). */
async function fetchCalendarNames(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let page = 1; page <= 25; page++) {
    const r = await fetch(
      `${ACALOG}/content.php?catoid=92&navoid=4142&cpage=${page}`,
      { headers: { 'User-Agent': UA } }
    );
    if (!r.ok) break;
    const html = await r.text();
    const entries = [...html.matchAll(
      /preview_course[^"']*coid=\d+[^"']*["'][^>]*>([^<]{5,120})/g
    )];
    if (!entries.length) break;
    for (const m of entries) {
      const text = decodeHtml(m[1]);
      // "CSCI 1020U – Programming Workshop I"
      const match = text.match(/^([A-Z]{2,6}\s+\d{4}[A-Z]{0,2})\s*[–-]\s*(.+)$/);
      if (match) map.set(match[1].trim(), match[2].trim());
    }
  }
  return map;
}

async function buildCourseList(): Promise<{ code: string; name: string; faculty: string }[]> {
  const names = await fetchCalendarNames();
  console.log(`[courses] calendar: ${names.size} courses`);
  return Array.from(names.entries())
    .map(([code, name]) => ({ code, name, faculty: code.replace(/\s.*/, '') }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

router.get('/', async (_req, res) => {
  if (cache && Date.now() - cache.at < TTL) {
    res.json(cache.courses);
    return;
  }

  try {
    const courses = await buildCourseList();
    cache = { courses, at: Date.now() };
    res.json(courses);
  } catch (err) {
    console.warn('[courses] fetch failed:', (err as Error).message);
    res.status(503).json({ error: 'Course data temporarily unavailable' });
  }
});

export default router;
