export type ProjectStage = '' | 'building' | 'live' | 'paused' | 'archived';
export interface Project {
  id: string;
  title: string;
  description: string;
  /** Up to 12 short names, such as Next.js. Missing in content saved before 2026-10-26. */
  technologies?: string[];
  stage?: ProjectStage;
  url: string;
  /** A second destination, such as the source code. */
  sourceUrl?: string;
  /** Logo or still preview, /uploads/<id>.<png|jpg|webp|gif>. */
  image: string;
  /** Short muted preview clip, /uploads/<id>.<mp4|webm>. */
  video?: string;
  /** Describes the image and video; not required when the media is decorative. */
  imageAlt: string;
  mediaDecorative?: boolean;
  status: 'draft' | 'published';
}
export interface Post {
  id: string;
  /** Web address segment, /blog/<slug>; assigned from the title when missing. */
  slug?: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  image: string;
  imageAlt: string;
  status: 'draft' | 'published';
}
export interface Content {
  revision: number;
  pages: Record<string, string>;
  posts: Post[];
  projects: Project[];
}
export type PublicContent = Omit<Content, 'revision'>;
export const defaultPages: Record<string, string>;
export const pageFields: [string, string, string, string, string][];
export function initialContent(): Content;
export const projectStages: Record<Exclude<ProjectStage, ''>, string>;
export const emptyProject: Omit<Project, 'id'>;
export const slugPattern: RegExp;
export function slugify(title: string): string;
export function assignSlugs<T extends { title: string; slug?: string }>(posts: T[]): (T & { slug: string })[];
