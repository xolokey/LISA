
import { GoogleGenAI, Type } from '@google/genai';
import { InvoiceData, Language, Persona, Sentiment, FileSearchResult, ChatMessage, Reminder, TodoItem, DraftEmail, CalendarEvent } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = ai.models;

// --- Mock File System for Semantic Search ---
const mockFileSystem = [
    { name: 'Q3_Marketing_Strategy.pdf', path: '/documents/strategies/', type: 'pdf', content: 'Our Q3 marketing strategy focuses on social media engagement and influencer partnerships to boost brand visibility.' },
    { name: '2024_Financial_Report.pdf', path: '/documents/reports/', type: 'pdf', content: 'The financial report for 2024 shows a 15% growth in revenue, driven by new product launches.' },
    { name: 'auth_service.ts', path: '/project/src/services/', type: 'code', content: 'export class AuthService { // Handles user authentication, login, and registration logic using JWT.' },
    { name: 'UserModal.tsx', path: '/project/src/components/', type: 'code', content: 'const UserModal = () => { // React component for displaying user profile information in a modal.' },
    { name: 'onboarding_guide.docx', path: '/documents/guides/', type: 'doc', content: 'This guide provides a step-by-step walkthrough for new employees to get acquainted with our systems.' },
];

const searchFiles = (query: string): FileSearchResult['files'] => {
    console.log(`Searching for: "${query}"`);
    const lowerQuery = query.toLowerCase();
    return mockFileSystem
        .filter(file => 
            file.name.toLowerCase().includes(lowerQuery) || 
            file.content.toLowerCase().includes(lowerQuery)
        )
        .map(({ name, path, type }) => ({ name, path, type: type as any }));
};
// --- End Mock File System ---


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const getLanguageName = (lang: Language): string => {
    switch (lang) {
        case Language.TAMIL: return 'Tamil';
        case Language.HINDI: return 'Hindi';
        case Language.SPANISH: return 'Spanish';
        case Language.FRENCH: return 'French';
        case Language.GERMAN: return 'German';
        case Language.JAPANESE: return 'Japanese';
        default: return 'English';
    }
};

const getSystemInstruction = (language: Language, persona: Persona) => {
    const languageName = getLanguageName(language);
    let personaInstruction = '';
    switch (persona) {
        case 'Formal':
            personaInstruction = 'Adopt a formal and professional tone in all your responses.';
            break;
        case 'Casual':
            personaInstruction = 'Adopt a friendly, casual, and conversational tone.';
            break;
        case 'Neutral':
        default:
            personaInstruction = 'Adopt a neutral, helpful, and direct tone.';
            break;
    }
    return `You are Lisa, an advanced AI personal assistant. Your role is to be a helpful and versatile assistant.
Your current user's language is ${languageName}. Respond in this language unless specified otherwise.
${personaInstruction}
Your capabilities include conversation, sentiment analysis, code generation, document parsing, task management (reminders, to-dos), calendar coordination, email drafting, and file searching via tools. Be helpful, proactive, and concise.`;
};

export const getGreeting = async (language: Language, persona: Persona): Promise<string> => {
    const languageName = getLanguageName(language);
    const prompt = `You are Lisa, an advanced AI assistant. Generate a short, friendly, welcoming greeting. The user's language is ${languageName} and their preferred tone is ${persona}. The response MUST be in ${languageName} and match the tone.
    Example in English (Neutral): "Hello! I'm Lisa. How can I help you today?"
    Your response should be only the greeting text.`;
    
    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.7 }
    });
    return result.text;
};

const tools = [{
    functionDeclarations: [
        {
            name: 'searchFiles',
            description: 'Searches the local file system for files based on a natural language query.',
            parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] }
        },
        {
            name: 'createReminder',
            description: 'Creates a reminder for the user.',
            parameters: { type: Type.OBJECT, properties: { task: { type: Type.STRING }, time: { type: Type.STRING } }, required: ['task', 'time'] }
        },
        {
            name: 'addTodoItem',
            description: 'Adds an item to the user\'s to-do list.',
            parameters: { type: Type.OBJECT, properties: { item: { type: Type.STRING } }, required: ['item'] }
        },
        {
            name: 'toggleTodoItem',
            description: 'Toggles the completion status of a to-do item. Use this to mark items as done or not done.',
            parameters: { type: Type.OBJECT, properties: { item: { type: Type.STRING, description: 'The exact text of the to-do item to toggle.' } }, required: ['item'] }
        },
        {
            name: 'removeTodoItem',
            description: 'Removes a to-do item from the list.',
            parameters: { type: Type.OBJECT, properties: { item: { type: Type.STRING, description: 'The exact text of the to-do item to remove.' } }, required: ['item'] }
        },
        {
            name: 'removeReminder',
            description: 'Removes a reminder from the list.',
            parameters: { type: Type.OBJECT, properties: { task: { type: Type.STRING, description: 'The exact text of the reminder task to remove.' } }, required: ['task'] }
        },
        {
            name: 'draftEmail',
            description: 'Drafts an email to a recipient with a subject and body.',
            parameters: { type: Type.OBJECT, properties: { to: { type: Type.STRING }, subject: { type: Type.STRING }, body: { type: Type.STRING } }, required: ['to', 'subject', 'body'] }
        },
        {
            name: 'startMindfulnessBreak',
            description: 'Initiates a mindfulness break for the user for a specified duration.',
            parameters: { type: Type.OBJECT, properties: { durationSeconds: { type: Type.INTEGER } }, required: ['durationSeconds'] }
        },
        {
            name: 'scheduleMeeting',
            description: 'Schedules a meeting or event in the user\'s calendar.',
            parameters: { 
                type: Type.OBJECT, 
                properties: { 
                    title: { type: Type.STRING }, 
                    time: { type: Type.STRING },
                    attendees: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of attendee names.' } 
                }, 
                required: ['title', 'time'] 
            }
        },
    ]
}];

export const generateChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  language: Language,
  persona: Persona,
  file?: File
): Promise<Partial<ChatMessage>> => {

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: { systemInstruction: getSystemInstruction(language, persona), tools }
  });

  const messageParts: any[] = [{ text: newMessage }];
  if (file) {
    messageParts.push(await fileToGenerativePart(file));
  }
  
  let result = await chat.sendMessage({ message: messageParts });

  let functionCalls = result.candidates?.[0]?.content?.parts
    .filter(part => !!part.functionCall)
    .map(part => part.functionCall);

  if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      let toolResponsePayload: Partial<ChatMessage> = {};
      let toolExecutionResult: any = {};

      console.log('Tool call detected:', call.name, call.args);

      if (call.name === 'searchFiles') {
          const files = searchFiles(call.args.query as string);
          toolExecutionResult = { files };
          toolResponsePayload = { fileSearchResult: { summary: '', files } };
      } else if (call.name === 'createReminder') {
          const reminder: Reminder = { id: '', ...call.args as any };
          toolExecutionResult = { status: 'success', reminder };
          toolResponsePayload = { reminder };
      } else if (call.name === 'addTodoItem') {
          const todo: TodoItem = { id: '', completed: false, ...call.args as any };
          toolExecutionResult = { status: 'success', todo };
          toolResponsePayload = { todo };
      } else if (call.name === 'toggleTodoItem') {
          toolExecutionResult = { status: 'success', item: call.args.item };
          toolResponsePayload = { todoToggled: { item: call.args.item as string, completed: true } };
      } else if (call.name === 'removeTodoItem') {
          toolExecutionResult = { status: 'success', item: call.args.item };
          toolResponsePayload = { todoRemoved: { item: call.args.item as string } };
      } else if (call.name === 'removeReminder') {
          toolExecutionResult = { status: 'success', task: call.args.task };
          toolResponsePayload = { reminderRemoved: { task: call.args.task as string } };
      } else if (call.name === 'draftEmail') {
          const email: DraftEmail = { ...call.args as any };
          toolExecutionResult = { status: 'success' };
          toolResponsePayload = { draftEmail: email };
      } else if (call.name === 'startMindfulnessBreak') {
          toolExecutionResult = { status: 'initiated' };
          toolResponsePayload = { breakTimer: { durationSeconds: call.args.durationSeconds as number } };
      } else if (call.name === 'scheduleMeeting') {
          const event: CalendarEvent = { id: '', ...call.args as any };
          toolExecutionResult = { status: 'success', event };
          toolResponsePayload = { calendarEvent: event };
      }
      
      const toolResponse = await chat.sendMessage({
          message: [{ functionResponse: { name: call.name, response: toolExecutionResult } }]
      });
      
      return { content: toolResponse.text, ...toolResponsePayload };
  }

  return { content: result.text };
};

export const analyzeSentiment = async (text: string): Promise<Sentiment> => {
  const result = await model.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the sentiment of the following text and classify it as 'positive', 'negative', or 'neutral'. Text: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: {
            type: Type.STRING,
            enum: ['positive', 'negative', 'neutral'],
          },
        },
      },
    },
  });
  const parsed = JSON.parse(result.text);
  return parsed.sentiment as Sentiment;
};

export const generateCode = async (prompt: string, language: Language, files: File[]): Promise<string> => {
    const languageName = getLanguageName(language);
    const languageInstruction = language === Language.ENGLISH
        ? 'Comments should be in English.'
        : `Important: All comments and explanations within the code must be in ${languageName}.`;
    
    const promptParts: any[] = [
        `You are an expert code generation assistant.`,
        `Generate a complete, production-ready code snippet based on the following request.`,
        `If files are provided, use them as context for the code generation.`,
        languageInstruction,
        `Provide only the code, wrapped in a single markdown block (e.g., \`\`\`language ... \`\`\`).`,
        `Do not add any explanation or introductory text outside the code block.`,
        `\nRequest: "${prompt}"`,
    ];

    for (const file of files) {
        promptParts.push(await fileToGenerativePart(file));
    }

    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: promptParts },
        config: {
          temperature: 0.2
        }
    });
    return result.text;
};


export const parseInvoice = async (imageFile: File): Promise<InvoiceData> => {
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = "Analyze the provided invoice image and extract the key information in JSON format according to the provided schema. Ensure the totalAmount is a number.";
  
  const result = await model.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          invoiceId: { type: Type.STRING },
          vendorName: { type: Type.STRING },
          customerName: { type: Type.STRING },
          invoiceDate: { type: Type.STRING },
          totalAmount: { type: Type.NUMBER },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.INTEGER },
                unitPrice: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    }
  });

  const parsedText = result.text.trim();
  return JSON.parse(parsedText) as InvoiceData;
};


export const generatePipeline = async (type: 'github' | 'azure', projectName: string, language: Language): Promise<string> => {
    const languageName = getLanguageName(language);
    const languageInstruction = language === Language.ENGLISH
        ? 'Add comments in English to explain each step.'
        : `Important: Add comments in ${languageName} to explain each step of the pipeline.`;

    const prompt = `
    Generate a complete, production-ready CI/CD pipeline configuration in YAML format.
    The pipeline is for a standard Node.js/React application.
    - Pipeline Type: ${type === 'github' ? 'GitHub Actions' : 'Azure DevOps'}
    - Project Name: ${projectName}
    
    The pipeline should include the following stages:
    1. Checkout code
    2. Setup Node.js
    3. Install dependencies (npm ci)
    4. Run linting (npm run lint)
    5. Run tests (npm test)
    6. Build the application (npm run build)

    ${languageInstruction}
    
    Provide only the YAML code, wrapped in a single markdown block. Do not add any explanation.
    `;
    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1
        }
    });
    return result.text;
};

export const performSemanticSearch = async (query: string, language: Language): Promise<FileSearchResult> => {
    const languageName = getLanguageName(language);
    const files = searchFiles(query);

    if (files.length === 0) {
        const result = await model.generateContent({
             model: 'gemini-2.5-flash',
             contents: `You are an AI assistant. The user searched for "${query}" but no files were found. Please provide a response in ${languageName} stating that no files were found.`
        });
        return { summary: result.text, files: [] };
    }
    
    const prompt = `
    You are a helpful AI assistant. You have just performed a file search for the query "${query}" and found the following files:
    ${JSON.stringify(files, null, 2)}
    
    Now, provide a brief, helpful summary of what you found for the user.
    The user's language is ${languageName}. The response MUST be in ${languageName}.
    `;

    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return { summary: result.text, files };
};