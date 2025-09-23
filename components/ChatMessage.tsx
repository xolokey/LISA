

import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType, InvoiceData, FileSearchResult, Language, Sentiment, Reminder, TodoItem, DraftEmail, CalendarEvent, GoogleUser } from '../types';
import Card from './common/Card';
import CodeBlock from './common/CodeBlock';
import { ICONS } from '../constants';
import { useAppContext } from '../context/AppContext';

// Translations for various UI components in the chat
const translations = {
    [Language.ENGLISH]: {
        invoiceDetails: 'Invoice Details',
        invoiceId: 'Invoice ID:',
        vendor: 'Vendor:',
        customer: 'Customer:',
        date: 'Date:',
        totalAmount: 'Total Amount:',
        fileSearchResults: 'File Search Results',
        reminderSet: 'Reminder Set',
        todoAdded: 'To-Do Added',
        todoCompleted: 'To-Do Completed',
        todoRemoved: 'To-Do Removed',
        reminderRemoved: 'Reminder Removed',
        emailDraft: 'Email Draft',
        to: 'To:',
        subject: 'Subject:',
        mindfulnessBreak: 'Mindfulness Break',
        breakDescription: 'Take a moment to relax and refocus. Close your eyes and breathe deeply.',
        stop: 'Stop',
        eventScheduled: 'Event Scheduled',
        sources: 'Sources'
    },
    // ... other languages would go here for full localization
};

// --- START: Local Sub-components for Rich Messages ---

const InvoiceCard: React.FC<{ data: InvoiceData }> = ({ data }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    return (
      <Card className="mt-2 text-sm !p-4 bg-background dark:bg-dark-background border-border-color dark:border-dark-border-color">
        <h4 className="font-bold text-md text-text-primary dark:text-dark-text-primary mb-2">{t.invoiceDetails}</h4>
        <div className="grid grid-cols-2 gap-2 text-text-secondary dark:text-dark-text-secondary">
          <p><strong>{t.invoiceId}</strong> {data.invoiceId || 'N/A'}</p>
          <p><strong>{t.vendor}</strong> {data.vendorName || 'N/A'}</p>
          <p><strong>{t.customer}</strong> {data.customerName || 'N/A'}</p>
          <p><strong>{t.date}</strong> {data.invoiceDate || 'N/A'}</p>
          <p className="font-bold text-base mt-2 col-span-2 text-text-primary dark:text-dark-text-primary"><strong>{t.totalAmount}</strong> {data.totalAmount?.toFixed(2) || '0.00'}</p>
        </div>
      </Card>
    );
};

const getFileIcon = (type: FileSearchResult['files'][0]['type']) => {
    switch (type) {
        case 'pdf': return ICONS.filePdf;
        case 'doc': return ICONS.fileDoc;
        case 'code': return ICONS.fileCode;
        default: return ICONS.fileGeneric;
    }
};

const FileSearchResultCard: React.FC<{ data: FileSearchResult }> = ({ data }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    return (
        <Card className="mt-2 text-sm !p-4 bg-background dark:bg-dark-background border-border-color dark:border-dark-border-color">
            <h4 className="font-bold text-md text-text-primary dark:text-dark-text-primary mb-2">{t.fileSearchResults}</h4>
            <div className="space-y-2">
                {data.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-surface dark:bg-dark-surface rounded-lg border border-border-color dark:border-dark-border-color">
                        <div className="text-primary dark:text-dark-primary">{getFileIcon(file.type)}</div>
                        <div>
                            <p className="font-semibold text-text-secondary dark:text-dark-text-secondary">{file.name}</p>
                            <p className="text-xs text-secondary dark:text-dark-secondary">{file.path}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const ReminderCard: React.FC<{ data: Reminder; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    return (
        <Card className="mt-2 !p-3 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20">
            <p className="font-semibold text-sm text-primary dark:text-dark-primary mb-1">{t.reminderSet}</p>
            <p className="text-text-primary dark:text-dark-text-primary"><strong>{data.task}</strong> at <strong>{data.time}</strong></p>
        </Card>
    );
};

const TodoCard: React.FC<{ data: TodoItem; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    const source = user ? 'via Google Tasks' : '';
    return (
        <Card className="mt-2 !p-3 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
            <p className="font-semibold text-sm text-blue-600 dark:text-blue-300 mb-1">{t.todoAdded}</p>
            <p className="text-text-primary dark:text-dark-text-primary">{data.item}</p>
            {source && <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{source}</p>}
        </Card>
    );
};

const TodoToggledCard: React.FC<{ data: NonNullable<ChatMessageType['todoToggled']>; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    const source = user ? 'in Google Tasks' : '';
    return (
        <Card className="mt-2 !p-3 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 flex items-center gap-3">
            <div className="text-green-600 dark:text-green-400">{ICONS.check}</div>
            <div>
                <p className="font-semibold text-sm text-green-600 dark:text-green-300">{t.todoCompleted}</p>
                <p className="text-text-primary dark:text-dark-text-primary line-through">{data.item}</p>
                {source && <p className="text-xs text-green-500 dark:text-green-400">{source}</p>}
            </div>
        </Card>
    );
};

const TodoRemovedCard: React.FC<{ data: NonNullable<ChatMessageType['todoRemoved']>; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
     const source = user ? 'from Google Tasks' : '';
    return (
        <Card className="mt-2 !p-3 bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 flex items-center gap-3">
            <div className="text-secondary dark:text-dark-secondary">{ICONS.trash}</div>
            <div>
                <p className="font-semibold text-sm text-secondary dark:text-dark-secondary">{t.todoRemoved}</p>
                <p className="text-text-secondary dark:text-dark-text-secondary">{data.item} {source}</p>
            </div>
        </Card>
    );
};

const ReminderRemovedCard: React.FC<{ data: NonNullable<ChatMessageType['reminderRemoved']>; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    return (
        <Card className="mt-2 !p-3 bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 flex items-center gap-3">
            <div className="text-secondary dark:text-dark-secondary">{ICONS.trash}</div>
            <div>
                <p className="font-semibold text-sm text-secondary dark:text-dark-secondary">{t.reminderRemoved}</p>
                <p className="text-text-secondary dark:text-dark-text-secondary">{data.task}</p>
            </div>
        </Card>
    );
};

const CalendarEventCard: React.FC<{ data: CalendarEvent; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    const source = user ? 'via Google Calendar' : '';
    return (
        <Card className="mt-2 !p-3 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-green-600 dark:text-green-300 mb-1">{t.eventScheduled}</p>
                <p className="text-text-primary dark:text-dark-text-primary"><strong>{data.title}</strong> at <strong>{data.time}</strong></p>
                {data.attendees && data.attendees.length > 0 && <p className="text-xs text-secondary dark:text-dark-secondary">Attendees: {data.attendees.join(', ')}</p>}
              </div>
              {source && <p className="text-xs text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-500/20 px-1.5 py-0.5 rounded-full">{source}</p>}
            </div>
        </Card>
    );
};

const EmailCard: React.FC<{ data: DraftEmail; user: GoogleUser | null }> = ({ data, user }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];
    const source = user ? 'via Gmail' : '';
    return (
        <Card className="mt-2 text-sm !p-4 bg-background dark:bg-dark-background border-border-color dark:border-dark-border-color">
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-md text-text-primary dark:text-dark-text-primary">{t.emailDraft}</h4>
                {source && <p className="text-xs text-secondary dark:text-dark-secondary bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{source}</p>}
            </div>
            <div className="space-y-2 text-text-secondary dark:text-dark-text-secondary">
                <p><strong>{t.to}</strong> {data.to}</p>
                <p><strong>{t.subject}</strong> {data.subject}</p>
                <hr className="my-2 border-border-color dark:border-dark-border-color" />
                <p className="whitespace-pre-wrap">{data.body}</p>
            </div>
        </Card>
    );
};

const BreakTimerCard: React.FC<{ duration: number }> = ({ duration }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const { language } = useAppContext();
    const t = translations[language] || translations[Language.ENGLISH];

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

    return (
        <Card className="mt-2 !p-4 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-center">
            <div className="text-purple-600 dark:text-purple-400 mb-2">{ICONS.mindfulness}</div>
            <h4 className="font-bold text-md text-purple-800 dark:text-purple-200">{t.mindfulnessBreak}</h4>
            <p className="text-purple-700 dark:text-purple-300 text-sm my-2">{t.breakDescription}</p>
            <div className="text-3xl font-bold text-purple-800 dark:text-purple-200 my-3">{formatTime(timeLeft)}</div>
            <button onClick={() => setTimeLeft(0)} className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm hover:bg-purple-700 transition-colors">
                {t.stop}
            </button>
        </Card>
    );
};

const InteractiveChoiceCard: React.FC<{ data: NonNullable<ChatMessageType['interactiveChoice']>, onSendMessage: (prompt: string) => void }> = ({ data, onSendMessage }) => {
    return (
        <div className="mt-2 space-y-2">
            <p className="text-sm font-medium">{data.prompt}</p>
            <div className="flex flex-wrap gap-2">
                {data.options.map(opt => (
                    <button key={opt.payload} onClick={() => onSendMessage(opt.payload)}
                        className="bg-surface dark:bg-dark-surface text-primary dark:text-dark-primary px-3 py-1 rounded-full text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 border border-primary dark:border-dark-primary">
                        {opt.title}
                    </button>
                ))}
            </div>
        </div>
    );
};


// --- END: Local Sub-components ---

const renderTextContent = (content: string) => {
  if (!content) return null;
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts = content.split(codeBlockRegex);
  
  if (parts.length <= 1) return <p className="whitespace-pre-wrap">{content}</p>;

  let isCode = false;
  return parts.map((part, index) => {
      if (!part) return null;
      if (part.match(/^(js|javascript|python|html|css|typescript|tsx|jsx|yaml|json|csharp|java|go|ruby|php|rust|kotlin|swift)$/)) return null;
      
      isCode = !isCode;
      if (!isCode) { return <CodeBlock key={index} code={part.trim()} />; } 
      else { return part.trim() ? <p key={index} className="whitespace-pre-wrap">{part.trim()}</p> : null; }
  }).filter(Boolean);
};

const getSentimentIcon = (sentiment?: Sentiment) => {
  if (!sentiment) return null;
  const iconMap = {
    positive: { icon: ICONS.sentimentPositive, title: 'Positive sentiment', className: 'text-green-500' },
    negative: { icon: ICONS.sentimentNegative, title: 'Negative sentiment', className: 'text-red-500' },
    neutral: { icon: ICONS.sentimentNeutral, title: 'Neutral sentiment', className: 'text-gray-400 dark:text-slate-500' },
  };
  const { icon, title, className } = iconMap[sentiment];
  return <span title={title} className={className}>{icon}</span>;
};

const ChatMessage: React.FC<{ message: ChatMessageType, onSendMessage: (prompt: string) => void; user: GoogleUser | null; }> = ({ message, onSendMessage, user }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const { language } = useAppContext();
  const t = translations[language] || translations[Language.ENGLISH];

  const handleShare = () => {
      let contentToCopy = message.content;
      navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  }

  const bubbleClasses = isUser 
    ? 'bg-primary text-white' 
    : 'bg-gray-100 dark:bg-dark-surface text-text-primary dark:text-dark-text-primary border border-border-color dark:border-dark-border-color';
  
  return (
    <div className={`group flex items-end gap-2 animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-slate-600 text-text-primary dark:text-dark-text-primary">
            L
        </div>
      )}
      <div className={`max-w-2xl rounded-xl p-1 ${bubbleClasses}`}>
        <div className="px-3 py-1 space-y-2">
            {message.fileInfo && (
              <div className="p-2 border border-gray-200 dark:border-slate-600 bg-surface dark:bg-dark-background rounded-md text-sm text-text-secondary dark:text-dark-text-secondary flex items-center gap-2">
                 {ICONS.attach}
                 <span>{message.fileInfo.name}</span>
              </div>
            )}
            {renderTextContent(message.content)}
            {message.invoiceData && <InvoiceCard data={message.invoiceData} />}
            {message.fileSearchResult && <FileSearchResultCard data={message.fileSearchResult} />}
            {message.reminder && <ReminderCard data={message.reminder} user={user} />}
            {message.todo && <TodoCard data={message.todo} user={user} />}
            {message.draftEmail && <EmailCard data={message.draftEmail} user={user} />}
            {message.calendarEvent && <CalendarEventCard data={message.calendarEvent} user={user} />}
            {message.todoToggled && <TodoToggledCard data={message.todoToggled} user={user} />}
            {message.todoRemoved && <TodoRemovedCard data={message.todoRemoved} user={user} />}
            {message.reminderRemoved && <ReminderRemovedCard data={message.reminderRemoved} user={user} />}
            {message.breakTimer && <BreakTimerCard duration={message.breakTimer.durationSeconds} />}
            {message.interactiveChoice && <InteractiveChoiceCard data={message.interactiveChoice} onSendMessage={onSendMessage} />}
            
            {message.groundingChunks && message.groundingChunks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-600">
                <h5 className="text-xs font-semibold mb-1 text-white/80 dark:text-slate-400">{t.sources}</h5>
                <div className="flex flex-wrap gap-2">
                  {message.groundingChunks.map((chunk, index) => chunk.web && (
                    <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" key={index} title={chunk.web.title}
                      className="flex items-center gap-1.5 bg-white/10 dark:bg-slate-700/50 hover:bg-white/20 dark:hover:bg-slate-600/50 text-xs text-white/90 dark:text-slate-300 px-2 py-0.5 rounded-full transition-colors">
                      {ICONS.web}
                      <span className="truncate max-w-48">{chunk.web.title || new URL(chunk.web.uri).hostname}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
      <div className="self-center flex flex-col gap-2 mb-1">
        {isUser && getSentimentIcon(message.sentiment)}
        <button onClick={handleShare} title={copied ? 'Copied!' : 'Share'} className="text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary opacity-0 group-hover:opacity-100 transition-opacity">
            {copied ? ICONS.check : ICONS.share}
        </button>
      </div>
       {isUser && user && (
        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full shrink-0"/>
      )}
       {isUser && !user && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary text-white">U</div>
      )}
    </div>
  );
};

export default ChatMessage;
