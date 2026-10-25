'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialContent, type PublicContent } from '../mockups/koreokorp-v2/content-model.js';

const defaults = initialContent();
const ContentContext = createContext({ content: defaults as PublicContent, error: false });

export function ContentProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState({ content: defaults as PublicContent, error: false });
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/content', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Content unavailable');
        return response.json() as Promise<PublicContent>;
      })
      .then((content) => {
        if (!controller.signal.aborted) {
          setValue({ content, error: false });
          if (content.pages.pageTitle) document.title = content.pages.pageTitle;
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setValue({ content: defaults, error: true });
      });
    return () => controller.abort();
  }, []);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext);
}
