import React from 'react';
import ReactMarkdown from 'react-markdown';
import "./MarkDown.scss";

interface MarkdownTextProps {
  text: string;
  preview?: boolean;
  maxLength?: number;
}

const MarkdownText: React.FC<MarkdownTextProps> = ({ text, preview = false, maxLength = 100 }) => {
  const displayText = preview ? text.substring(0, maxLength) + (text.length > maxLength ? '...' : '') : text;

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownText;
