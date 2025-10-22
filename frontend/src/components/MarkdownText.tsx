import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownTextProps {
  text: string;
  preview?: boolean;
  maxLength?: number;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ text, preview = false, maxLength = 100 }) => {
  // Если это превью, обрезаем текст до указанной длины
  const displayText = preview ? text.substring(0, maxLength) + (text.length > maxLength ? '...' : '') : text;

  return (
    <ReactMarkdown
      components={{
        // Стили для ссылок
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#4a90e2',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {children}
          </a>
        ),
        // Стили для заголовков
        h1: ({ children }) => (
          <h1 style={{ fontSize: '24px', margin: '20px 0 10px 0', color: '#333' }}>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontSize: '20px', margin: '18px 0 8px 0', color: '#333' }}>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: '18px', margin: '16px 0 6px 0', color: '#333' }}>
            {children}
          </h3>
        ),
        // Стили для списков
        ul: ({ children }) => (
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
            {children}
          </ol>
        ),
        // Стили для кода
        code: ({ children }) => (
          <code style={{
            background: '#f4f4f4',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre style={{
            background: '#f4f4f4',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            margin: '10px 0'
          }}>
            {children}
          </pre>
        ),
        // Стили для цитат
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: '4px solid #4a90e2',
            margin: '10px 0',
            padding: '10px 15px',
            background: '#f8f9fa',
            fontStyle: 'italic'
          }}>
            {children}
          </blockquote>
        ),
        // Стили для параграфов
        p: ({ children }) => (
          <p style={{ margin: '10px 0', lineHeight: '1.6' }}>
            {children}
          </p>
        )
      }}
    >
      {displayText}
    </ReactMarkdown>
  );
};

export default MarkdownText;