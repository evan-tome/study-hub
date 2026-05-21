import { Router } from 'express';

const router = Router();

const BANNER = 'https://ssp.mycampus.ca/StudentRegistrationSsb/ssb';
const ACALOG = 'https://calendar.ontariotechu.ca';
const MEP = 'UOIT';
const UA = 'StudyHub/1.0';

interface BannerTerm  { code: string; description: string }
interface BannerCombo { code: string; description: string }

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

/** Pick the current active registration term (first without "View Only"). */
async function activeTerm(): Promise<string> {
  const r = await fetch(
    `${BANNER}/classSearch/getTerms?searchTerm=&offset=1&max=10&mepCode=${MEP}`,
    { headers: { 'User-Agent': UA } }
  );
  if (!r.ok) throw new Error(`getTerms ${r.status}`);
  const terms = await r.json() as BannerTerm[];
  const term = terms.find(t => !/view only/i.test(t.description)) ?? terms[0];
  if (!term) throw new Error('no terms');
  return term.code;
}

/** Fetch course codes offered in the given term from Banner SSB. */
async function fetchBannerCodes(term: string): Promise<BannerCombo[]> {
  const r = await fetch(
    `${BANNER}/classSearch/get_subjectcoursecombo?searchTerm=&term=${term}&offset=1&max=999&mepCode=${MEP}`,
    { headers: { 'User-Agent': UA } }
  );
  if (!r.ok) throw new Error(`get_subjectcoursecombo ${r.status}`);
  return r.json() as Promise<BannerCombo[]>;
}

async function buildCourseList(): Promise<{ code: string; name: string; faculty: string }[]> {
  const [names, termCode] = await Promise.all([
    fetchCalendarNames(),
    activeTerm(),
  ]);
  const bannerCodes = await fetchBannerCodes(termCode);
  console.log(`[courses] calendar: ${names.size} names | Banner term ${termCode}: ${bannerCodes.length} codes`);

  return bannerCodes
    .map(c => {
      // "CSCI1020U" → "CSCI 1020U"
      const code = c.code.replace(/([A-Z]+)(\d)/, '$1 $2');
      // Look up real name from calendar, fall back to subject area from Banner
      const subjectArea = decodeHtml(c.description.replace(/^\S+\s*/, '').trim());
      const name = names.get(code) ?? subjectArea;
      return { code, name, faculty: c.code.replace(/\d.*/, '') };
    })
    .sort((a: any, b: any) => a.code.localeCompare(b.code));
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
