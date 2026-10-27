import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  className?: string;
}

/**
 * Renderiza un texto que puede contener fórmulas LaTeX delimitadas por $...$ o \[...\].
 * Si KaTeX falla, se muestra el texto crudo sin romper la UI.
 */
export function MathText({ text, className }: Props) {
  if (!text) return null;

  // Divide el texto en segmentos: fórmulas y texto plano
  const parts: { type: 'text' | 'math'; value: string; display: boolean }[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\\\[[\s\S]+?\\\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index), display: false });
    }
    const raw = match[0];
    let math = raw;
    let display = false;
    if (raw.startsWith('$$')) {
      math = raw.slice(2, -2);
      display = true;
    } else if (raw.startsWith('$')) {
      math = raw.slice(1, -1);
    } else if (raw.startsWith('\\[')) {
      math = raw.slice(2, -2);
      display = true;
    }
    parts.push({ type: 'math', value: math, display });
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex), display: false });
  }

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.type === 'text') {
          return <React.Fragment key={idx}>{part.value}</React.Fragment>;
        }
        try {
          const html = katex.renderToString(part.value, {
            throwOnError: false,
            displayMode: part.display,
          });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <React.Fragment key={idx}>{part.value}</React.Fragment>;
        }
      })}
    </span>
  );
}
