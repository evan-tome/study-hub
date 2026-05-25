import { Router } from 'express';

const router = Router();

// the course list is scraped from the OTU academic calendar (Acalog)
const ACALOG = 'https://calendar.ontariotechu.ca';
const UA = 'StudyHub/1.0'; // custom user agent to avoid being blocked by Acalog

// cache the course list in memory for 24 hours to reduce load
let cache: { courses: { code: string; name: string }[]; at: number } | null = null;
const TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// get course name from code using the cache, returns code if not found
export function getCachedCourseName(code: string): string {
  if (!cache) return code;
  return cache.courses.find((c) => c.code === code)?.name ?? code;
}

// decode symbols in course name to get readable display name
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

// scrape all course names from the OTU academic calendar (Acalog)
async function fetchCalendarNames(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  // Acalog paginates courses in groups of 20, loop through pages until no more courses are found
  for (let page = 1; page <= 25; page++) {
    const r = await fetch(
      `${ACALOG}/content.php?catoid=92&navoid=4142&cpage=${page}`,
      { headers: { 'User-Agent': UA } }
    );
    if (!r.ok) break;
    const html = await r.text();
    // each course entry looks like: <a href="preview_course.php?catoid=92&amp;coid=12345" ...>CSCI 1020U – Programming Workshop I</a>
    const entries = [...html.matchAll(
      /preview_course[^"']*coid=\d+[^"']*["'][^>]*>([^<]{5,120})/g
    )];
    if (!entries.length) break; // stop pagination if no courses found

    // extract course code and name from each entry and store in the map
    for (const m of entries) {
      const text = decodeHtml(m[1]);
      // "CSCI 1020U – Programming Workshop I"
      const match = text.match(/^([A-Z]{2,6}\s+\d{4}[A-Z]{0,2})\s*[–-]\s*(.+)$/); // split code and name by " – " or " - "
      if (match) map.set(match[1].trim(), match[2].trim()); // store in map with code as key and name as value
    }
  }
  return map;
}
 // build the course list by fetching from Acalog and formatting it as an array of { code, name, department }
async function buildCourseList(): Promise<{ code: string; name: string; department: string }[]> {
  const names = await fetchCalendarNames();
  console.log(`[courses] calendar: ${names.size} courses`);
  return Array.from(names.entries())
    .map(([code, name]) => ({ code, name, department: code.replace(/\s.*/, '') })) // extract department from course code (e.g. "CSCI" from "CSCI 1020U")
    .sort((a, b) => a.code.localeCompare(b.code)); // sort courses by code alphabetically
}

 // GET /courses - return the list of courses
router.get('/', async (_req, res) => {
  // if cache is available and not expired, return cached courses
  if (cache && Date.now() - cache.at < TTL) {
    res.json(cache.courses);
    return;
  }

  // otherwise, fetch course data from Acalog
  try {
    const courses = await buildCourseList();
    cache = { courses, at: Date.now() };
    res.json(courses);
  // if fetching fails log error
  } catch (err) {
    console.warn('[courses] fetch failed:', (err as Error).message);
    res.status(503).json({ error: 'Course data temporarily unavailable' });
  }
});

export default router;
