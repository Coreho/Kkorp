export interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
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
export const slugPattern: RegExp;
export function slugify(title: string): string;
export function assignSlugs<T extends { title: string; slug?: string }>(posts: T[]): (T & { slug: string })[];
