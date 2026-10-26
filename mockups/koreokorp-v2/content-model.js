// Keep public defaults independent of editor labels for a small client bundle.
export const defaultPages = {
  pageTitle: 'KoreoKorp V2 Mockup',
  landingKicker: 'Signal found',
  landingTag: 'A small corner of the internet.',
  landingHint: 'Click the logo to enter',
  aboutIntro: 'A small corner of the internet. Posts, projects, and a chat room you can walk into with nothing but a screen name.',
  aboutBody: 'KoreoKorp is a small corner of the internet: posts, projects, and a chat room from 2003 living inside a modern website. No accounts, no feed. Pick a name and say hi.',
  aboutHeading: 'About',
  aboutAction: 'About',
  email: 'you@koreokorp.com',
  github: 'github.com/your-handle',
  timeline1: 'Away messages, buddy lists, 56k.',
  timelineYear1: '2003',
  timeline2: 'KoreoKorp V1 goes up.',
  timelineYear2: '20XX',
  timeline3: 'V2: four panels, a blog, and The Lobby.',
  timelineYear3: '2026',
  blogHeading: 'Blog',
  blogIntro: 'Notes and updates, written from the admin page and published here.',
  blogAction: 'Read the blog',
  projectsHeading: 'Projects',
  projectsIntro: 'Things being built, tried, and occasionally finished.',
  projectsAction: 'See projects',
  chatHeading: 'Chat room',
  chatIntro: 'One shared room. Pick a screen name and jump in. Two bots are always here, and they never stop talking.',
  chatAction: 'Enter the room',
};

export const pageFields = [
  ['Landing', 'pageTitle', 'Browser title', 'title', defaultPages.pageTitle],
  ['Landing', 'landingKicker', 'Landing caption', '.landing-kicker', defaultPages.landingKicker],
  ['Landing', 'landingTag', 'Tagline', '.landing-tag', defaultPages.landingTag],
  ['Landing', 'landingHint', 'Entry hint', '.landing-hint', defaultPages.landingHint],
  ['About', 'aboutIntro', 'Short introduction', '[data-panel="about"] .blurb', defaultPages.aboutIntro],
  ['About', 'aboutBody', 'About text', '[data-panel="about"] .long', defaultPages.aboutBody],
  ['About', 'aboutHeading', 'About heading', '[data-panel="about"] [data-heading]', defaultPages.aboutHeading],
  ['About', 'aboutAction', 'About button', '[data-panel="about"] [data-open] span', defaultPages.aboutAction],
  ['About', 'email', 'Contact email', '#mail', defaultPages.email],
  ['About', 'github', 'GitHub address', '.links li:nth-child(2) code', defaultPages.github],
  ['About', 'timeline1', 'Timeline · 2003', '.tl li:nth-child(1) span', defaultPages.timeline1],
  ['About', 'timelineYear1', 'First timeline year', '.tl li:nth-child(1) b', defaultPages.timelineYear1],
  ['About', 'timeline2', 'Timeline · 20XX', '.tl li:nth-child(2) span', defaultPages.timeline2],
  ['About', 'timelineYear2', 'Second timeline year', '.tl li:nth-child(2) b', defaultPages.timelineYear2],
  ['About', 'timeline3', 'Timeline · 2026', '.tl li:nth-child(3) span', defaultPages.timeline3],
  ['About', 'timelineYear3', 'Third timeline year', '.tl li:nth-child(3) b', defaultPages.timelineYear3],
  ['Blog', 'blogHeading', 'Blog heading', '[data-panel="blog"] [data-heading]', defaultPages.blogHeading],
  ['Blog', 'blogIntro', 'Blog introduction', '[data-panel="blog"] .blurb', defaultPages.blogIntro],
  ['Blog', 'blogAction', 'Blog button', '[data-panel="blog"] [data-open] span', defaultPages.blogAction],
  ['Projects', 'projectsHeading', 'Projects heading', '[data-panel="projects"] [data-heading]', defaultPages.projectsHeading],
  ['Projects', 'projectsIntro', 'Projects introduction', '[data-panel="projects"] .blurb', defaultPages.projectsIntro],
  ['Projects', 'projectsAction', 'Projects button', '[data-panel="projects"] [data-open] span', defaultPages.projectsAction],
  ['The Lobby', 'chatHeading', 'Lobby heading', '[data-panel="chat"] [data-heading]', defaultPages.chatHeading],
  ['The Lobby', 'chatIntro', 'Lobby introduction', '[data-panel="chat"] .blurb', defaultPages.chatIntro],
  ['The Lobby', 'chatAction', 'Lobby button', '[data-panel="chat"] [data-open] span', defaultPages.chatAction],
];

// Where a project stands, shown with it. An empty stage shows nothing.
export const projectStages = { building: 'In progress', live: 'Live', paused: 'Paused', archived: 'Archived' };

// Every project field with its empty value. Content saved before a field existed
// is read with these defaults, so older content.json files stay valid.
export const emptyProject = {
  title: '', description: '', technologies: [], stage: '', url: '', sourceUrl: '',
  image: '', video: '', imageAlt: '', mediaDecorative: false, status: 'draft',
};

export function initialContent() {
  return {
    revision: 0,
    pages: { ...defaultPages },
    posts: [],
    projects: [
      { ...emptyProject, id: 'koreokorp-v2', title: 'KoreoKorp V2', description: 'This site. Four panels, one blog, one chat room.', status: 'published' },
      { ...emptyProject, id: 'the-lobby', title: 'The Lobby', description: 'A shared chat room with screen names and two resident bots.', status: 'published' },
    ],
  };
}

// A post's web address: /blog/<slug>. Lowercase ASCII words joined by hyphens.
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(title) {
  const words = String(title).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return words.slice(0, 72).replace(/-+$/, '') || 'post';
}

// Kept slugs are reserved first, so a published address never moves when a
// newer entry has the same title. Missing or duplicate slugs come from the title.
export function assignSlugs(posts) {
  const taken = new Set();
  const kept = posts.map((post) => {
    const slug = typeof post.slug === 'string' && slugPattern.test(post.slug) && post.slug.length <= 80 && !taken.has(post.slug) ? post.slug : '';
    if (slug) taken.add(slug);
    return slug;
  });
  return posts.map((post, index) => {
    let slug = kept[index];
    if (!slug) {
      const base = slugify(post.title);
      slug = base;
      for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;
      taken.add(slug);
    }
    return { ...post, slug };
  });
}
