import type { ReactNode } from 'react';
import { parseMarkdown, type Block, type Inline } from '@/mockups/koreokorp-v2/markdown.js';

/**
 * Renders an entry's Markdown as React elements. Nothing is injected as HTML,
 * so markup typed into an entry appears as text; see mockups/koreokorp-v2/markdown.js.
 */
function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value;
      case 'code':
        return <code key={index}>{node.value}</code>;
      case 'strong':
        return <strong key={index}>{inline(node.children)}</strong>;
      case 'em':
        return <em key={index}>{inline(node.children)}</em>;
      case 'link':
        return <a key={index} href={node.href}>{inline(node.children)}</a>;
      case 'break':
        return <br key={index} />;
    }
  });
}

function block(node: Block, index: number): ReactNode {
  switch (node.type) {
    case 'heading': {
      const Heading = `h${node.level}` as const;
      return <Heading key={index}>{inline(node.children)}</Heading>;
    }
    case 'paragraph':
      return <p key={index}>{inline(node.children)}</p>;
    case 'code':
      return <pre key={index}><code>{node.value}</code></pre>;
    case 'quote':
      return <blockquote key={index}>{node.children.map(block)}</blockquote>;
    case 'list': {
      const items = node.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>);
      return node.ordered
        ? <ol key={index} start={node.start === 1 ? undefined : node.start}>{items}</ol>
        : <ul key={index}>{items}</ul>;
    }
    case 'rule':
      return <hr key={index} />;
  }
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={className}>{parseMarkdown(source).map(block)}</div>;
}
