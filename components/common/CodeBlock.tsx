import React, { useState } from 'react';
import { ICONS } from '../../constants';

interface CodeBlockProps {
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = code.replace(/```.*\n/g, '').replace(/```/g, '').trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background rounded-lg my-4 relative border border-border-color">
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        className="absolute top-3 right-3 p-1.5 bg-surface hover:bg-gray-100 rounded-md text-secondary hover:text-text-primary transition-all"
      >
        {copied ? ICONS.check : ICONS.copy}
      </button>
      <pre className="p-4 overflow-x-auto text-sm text-text-secondary">
        <code className="font-mono">{cleanCode}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;