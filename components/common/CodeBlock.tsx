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
    <div className="bg-background dark:bg-dark-background rounded-lg my-4 relative border border-border-color dark:border-dark-border-color">
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        className="absolute top-3 right-3 p-1.5 bg-surface dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-secondary dark:text-dark-secondary hover:text-text-primary dark:hover:text-dark-text-primary transition-all"
      >
        {copied ? ICONS.check : ICONS.copy}
      </button>
      <pre className="p-4 overflow-x-auto text-sm text-text-secondary dark:text-dark-text-secondary">
        <code className="font-mono">{cleanCode}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;