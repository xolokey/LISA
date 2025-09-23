





import { GoogleGenAI, Type, Modality } from '@google/genai';
import { InvoiceData, Language, Persona, Sentiment, FileSearchResult, ChatMessage, Reminder, TodoItem, DraftEmail, CalendarEvent, ProjectFiles } from '../types';

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

const getSystemInstruction = (language: Language, persona: Persona, isSignedIn: boolean) => {
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

    const authContext = isSignedIn
      ? 'You are connected to the user\'s Google Account. You can manage their Google Calendar, Google Tasks, and draft emails in Gmail. When confirming actions, mention the service (e.g., "Added to Google Calendar").'
      : 'The user is not signed in. You can still manage a local calendar, to-do list, and draft emails.';

    return `You are Lisa, an advanced AI personal assistant. Your role is to be a helpful and versatile assistant.
Your current user's language is ${languageName}. Respond in this language unless specified otherwise.
${personaInstruction}
${authContext}
Your capabilities include conversation, sentiment analysis, code generation, document parsing, task management (reminders, to-dos), calendar coordination, email drafting, file searching via tools, and accessing up-to-date information with Google Search. Be helpful, proactive, and concise.`;
};

const functionCallingTools = [{
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
        {
          name: 'presentChoices',
          description: 'Presents the user with a set of choices to clarify an ambiguous request.',
          parameters: {
              type: Type.OBJECT,
              properties: {
                  prompt: { type: Type.STRING, description: 'The question to ask the user.' },
                  options: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              title: { type: Type.STRING, description: 'The user-facing text for the button.' },
                              payload: { type: Type.STRING, description: 'The text sent back to the model if the user clicks it.' }
                          }
                      }
                  }
              },
              required: ['prompt', 'options']
          }
        }
    ]
}];

export const generateChatResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  language: Language,
  persona: Persona,
  isSignedIn: boolean,
  file?: File,
  useGoogleSearch?: boolean,
): Promise<Partial<ChatMessage>> => {

  const config: any = { systemInstruction: getSystemInstruction(language, persona, isSignedIn) };
  if (useGoogleSearch) {
    config.tools = [{ googleSearch: {} }];
  } else {
    config.tools = functionCallingTools;
  }

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: config,
  });

  const messageParts: any[] = [{ text: newMessage }];
  if (file) {
    messageParts.push(await fileToGenerativePart(file));
  }
  
  let result = await chat.sendMessage({ message: messageParts });
  
  const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;

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
      } else if (call.name === 'presentChoices') {
          return {
              interactiveChoice: {
                  prompt: call.args.prompt as string,
                  options: call.args.options as any[],
              },
              content: ''
          };
      }
      
      const toolResponse = await chat.sendMessage({
          message: [{ functionResponse: { name: call.name, response: toolExecutionResult } }]
      });
      
      return { content: toolResponse.text, groundingChunks, ...toolResponsePayload };
  }

  return { content: result.text, groundingChunks };
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

// --- START: New Code Generation Service ---

const codeGenerationSystemInstruction = `You are a collective of world-class software engineers operating as a single entity, an AI code generation expert named Lisa. Your expertise spans the entire software development lifecycle and a multitude of roles, including:
- **Software Developer/Engineer**: You write clean, efficient, scalable, and maintainable code in any language. You are a master of algorithms, data structures, and software architecture.
- **AI/ML Engineers**: You understand and can implement complex AI and machine learning models, data pipelines, and infrastructure.
- **DevOps, Site Reliability (SREs), and Platform Engineers**: You are an expert in CI/CD, infrastructure as code (Terraform, Pulumi), containerization (Docker, Kubernetes), monitoring, and ensuring high availability and reliability.
- **Data and Analytics**: You can design data models, write complex SQL queries, and build data-intensive applications.
- **Cybersecurity Specialists**: You write secure code by default, understand threat modeling, and can implement security best practices.
- **Infrastructure and Cloud Roles**: You are proficient in AWS, Google Cloud, and Azure, and can design and manage cloud infrastructure.
- **Quality Assurance and Testing**: You generate code with testing in mind, including unit tests, integration tests, and end-to-end tests.
- **Design and User Experience**: You can generate front-end code (HTML, CSS, JavaScript, React, etc.) that is not only functional but also aesthetically pleasing, accessible (ARIA), and user-friendly.
- **Product and Strategy Roles**: You understand the business context and can make intelligent decisions about features and implementation details.
- **Leadership and Architecture**: You can design entire systems, considering trade-offs and future scalability. You create logical and well-organized file structures.
- **Blockchain Developers/Architects**: You are capable of creating smart contracts and decentralized applications.
- **Technical Writers**: You produce excellent documentation, including README files and code comments, in the requested language.

Your primary goal is to assist the user in building and modifying software projects directly within this web-based IDE. You will be given requests to generate entire projects, or to modify specific files within an existing project structure. Adhere strictly to the output format requested in the prompt.`;

const processJsonResponse = (jsonText: string): ProjectFiles => {
    try {
        const fileArray: { filePath: string; content: string }[] = JSON.parse(jsonText.trim());
        const projectFiles: ProjectFiles = fileArray.reduce((acc, file) => {
            acc[file.filePath] = file.content;
            return acc;
        }, {} as ProjectFiles);
        return projectFiles;
    } catch (e) {
        console.error("Failed to parse JSON response from AI:", jsonText);
        throw new Error("AI returned invalid project structure. Please try again.");
    }
};

const fileListSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            filePath: { type: Type.STRING },
            content: { type: Type.STRING }
        },
        required: ['filePath', 'content']
    }
};

export const generateProjectFromPrompt = async (prompt: string, language: Language): Promise<ProjectFiles> => {
    const languageName = getLanguageName(language);
    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the following request, generate a complete file structure and the content for each file. The user's preferred language for comments and documentation is ${languageName}.
        
Request: "${prompt}"

Your output MUST be a single, valid JSON array of objects, where each object has a "filePath" (e.g., 'src/App.js') and a "content" key.
For web projects, ensure the 'index.html' is self-contained or uses relative paths correctly for the live preview to work. For complex apps, include a 'README.md' with setup instructions.`,
        config: {
            systemInstruction: codeGenerationSystemInstruction,
            responseMimeType: "application/json",
            temperature: 0.1,
            responseSchema: fileListSchema
        }
    });
    return processJsonResponse(result.text);
}

export const generateProjectFromRepoUrl = async (repoUrl: string, language: Language): Promise<ProjectFiles> => {
    const languageName = getLanguageName(language);
    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: `I will provide a public GitHub repository URL. Your task is to act as a web scraper and code analyzer. "Scrape" the repository, understand its structure and the content of each file, and then generate a complete file structure and content for the entire project. The user's preferred language for any generated comments or documentation is ${languageName}.
        
GitHub URL: "${repoUrl}"

Your output MUST be a single, valid JSON array of objects, where each object has a "filePath" and a "content" key.
For web projects, ensure the 'index.html' is self-contained or uses relative paths correctly for the live preview to work.`,
        config: {
            systemInstruction: codeGenerationSystemInstruction,
            responseMimeType: "application/json",
            temperature: 0.1,
            responseSchema: fileListSchema
        }
    });
    return processJsonResponse(result.text);
};

interface ProjectEditResult {
    summary: string;
    fileChanges: { filePath: string; content: string }[];
}

export const performProjectEdit = async (
    chatHistory: { role: 'user' | 'model'; content: string }[],
    userPrompt: string,
    projectFiles: ProjectFiles,
    language: Language
): Promise<ProjectEditResult> => {
    const languageName = getLanguageName(language);
    const serializedProject = JSON.stringify(projectFiles, null, 2);
    // Use only the last 6 turns of conversation to keep the prompt size manageable
    const serializedHistory = chatHistory.slice(-6).map(turn => `${turn.role}: ${turn.content}`).join('\n');

    const prompt = `You are performing edits on a software project. Your generated comments and documentation should be in ${languageName}.
        
PROJECT CONTEXT (Full file structure and content):
\`\`\`json
${serializedProject}
\`\`\`
        
RECENT CHAT HISTORY:
${serializedHistory}

USER'S LATEST REQUEST:
"${userPrompt}"

Based on the user's request, the chat history, and the full project context, determine the necessary file modifications. This can include editing existing files, creating new files, or deleting files (by returning an empty 'content' string for that file path).
Your output MUST be a single, valid JSON object with two keys:
1. "summary": A brief, friendly, natural-language summary (in ${languageName}) of the changes you made for the chat interface. Describe what you did.
2. "fileChanges": An array of objects, where each object has a "filePath" and the new complete "content" for that file.`;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING },
            fileChanges: fileListSchema
        },
        required: ['summary', 'fileChanges']
    };

    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: codeGenerationSystemInstruction,
            responseMimeType: "application/json",
            temperature: 0.0,
            responseSchema: responseSchema
        }
    });

    return JSON.parse(result.text.trim()) as ProjectEditResult;
};


// --- END: New Code Generation Service ---


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

export const generateChatTitle = async (firstMessage: string): Promise<string> => {
    const prompt = `Generate a very short, concise title (4-5 words max) for a chat session that starts with this message: "${firstMessage}". The title should be in the same language as the message. Do not add quotes or any other formatting around the title. Just return the title text.`;
    const result = await model.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.3 }
    });
    return result.text.replace(/"/g, '').trim();
};


export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as any,
        },
    });
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, imageFile: File): Promise<{text?: string; imageUrl?: string}> => {
    const imagePart = await fileToGenerativePart(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                imagePart,
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    let textResult: string | undefined;
    let imageUrlResult: string | undefined;

    for (const part of response.candidates[0].content.parts) {
        if (part.text) {
            textResult = part.text;
        } else if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            imageUrlResult = `data:image/png;base64,${base64ImageBytes}`;
        }
    }
    return { text: textResult, imageUrl: imageUrlResult };
};