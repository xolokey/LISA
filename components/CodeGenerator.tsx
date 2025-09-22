import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import Spinner from './common/Spinner';
import CodeBlock from './common/CodeBlock';
import { generateCode } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { Language } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { ICONS } from '../constants';

type FileStatus = {
  [key: string]: 'processing' | 'success';
};

const translations = {
  [Language.ENGLISH]: {
    title: 'Code Generator',
    description: 'Describe the code you need, and the AI will generate it for you. Provide files for context. Be as specific as possible for the best results.',
    placeholder: 'e.g., A React component for a login form with email and password fields using TypeScript and Tailwind CSS.',
    button: 'Generate Code',
    generatedCode: 'Generated Code:',
    error: 'Please enter a description for the code you want to generate.',
    errorFailed: 'Failed to generate code. Please try again.',
    uploadButton: 'Upload Files or Drag & Drop',
    contextFiles: 'Context Files:',
  },
  [Language.TAMIL]: {
    title: 'குறியீடு ஜெனரேட்டர்',
    description: 'உங்களுக்குத் தேவையான குறியீட்டை விவரிக்கவும், AI அதை உங்களுக்காக உருவாக்கும். சூழலுக்கு கோப்புகளை வழங்கவும். சிறந்த முடிவுகளுக்கு முடிந்தவரை குறிப்பாக இருங்கள்.',
    placeholder: 'எ.கா., டைப்ஸ்கிரிப்ட் மற்றும் டெயில்விண்ட் சிஎஸ்எஸ் பயன்படுத்தி உள்நுழைவு படிவத்திற்கான ஒரு ரியாக்ட் கூறு.',
    button: 'குறியீட்டை உருவாக்கு',
    generatedCode: 'உருவாக்கப்பட்ட குறியீடு:',
    error: 'நீங்கள் உருவாக்க விரும்பும் குறியீட்டிற்கான விளக்கத்தை உள்ளிடவும்.',
    errorFailed: 'குறியீட்டை உருவாக்கத் தவறிவிட்டது. மீண்டும் முயக்கவும்.',
    uploadButton: 'கோப்புகளைப் பதிவேற்று அல்லது இழுத்து விடுங்கள்',
    contextFiles: 'சூழல் கோப்புகள்:',
  },
  [Language.HINDI]: {
    title: 'कोड जेनरेटर',
    description: 'आपको जिस कोड की आवश्यकता है उसका वर्णन करें, और AI इसे आपके लिए उत्पन्न करेगा। संदर्भ के लिए फ़ाइलें प्रदान करें। सर्वोत्तम परिणामों के लिए यथासंभव विशिष्ट रहें।',
    placeholder: 'उदा., टाइपस्क्रिप्ट और टेलविंड सीएसएस का उपयोग करके लॉगिन फॉर्म के लिए एक रिएक्ट कंपोनेंट।',
    button: 'कोड जेनरेट करें',
    generatedCode: 'जेनरेट किया गया कोड:',
    error: 'कृपया उस कोड का विवरण दर्ज करें जिसे आप उत्पन्न करना चाहते हैं।',
    errorFailed: 'कोड जेनरेट करने में विफल। कृपया पुन: प्रयास करें।',
    uploadButton: 'फ़ाइलें अपलोड करें या खींचें और छोड़ें',
    contextFiles: 'संदर्भ फ़ाइलें:',
  },
  [Language.SPANISH]: {
    title: 'Generador de Código',
    description: 'Describe el código que necesitas y la IA lo generará para ti. Proporciona archivos para el contexto. Sé lo más específico posible para obtener los mejores resultados.',
    placeholder: 'Ej., Un componente de React para un formulario de inicio de sesión con campos de correo electrónico y contraseña usando TypeScript y Tailwind CSS.',
    button: 'Generar Código',
    generatedCode: 'Código Generado:',
    error: 'Por favor, introduce una descripción para el código que quieres generar.',
    errorFailed: 'No se pudo generar el código. Por favor, inténtalo de nuevo.',
    uploadButton: 'Subir Archivos o Arrastrar y Soltar',
    contextFiles: 'Archivos de Contexto:',
  },
  [Language.FRENCH]: {
    title: 'Générateur de Code',
    description: 'Décrivez le code dont vous avez besoin, et l\'IA le générera pour vous. Fournissez des fichiers pour le contexte. Soyez aussi précis que possible pour de meilleurs résultats.',
    placeholder: 'Ex., Un composant React pour un formulaire de connexion avec des champs email et mot de passe en utilisant TypeScript et Tailwind CSS.',
    button: 'Générer le Code',
    generatedCode: 'Code Généré :',
    error: 'Veuillez saisir une description pour le code que vous souhaitez générer.',
    errorFailed: 'Échec de la génération du code. Veuillez réessayer.',
    uploadButton: 'Télécharger des Fichiers ou Glisser-Déposer',
    contextFiles: 'Fichiers de Contexte :',
  },
  [Language.GERMAN]: {
    title: 'Code-Generator',
    description: 'Beschreiben Sie den Code, den Sie benötigen, und die KI wird ihn für Sie generieren. Stellen Sie Dateien für den Kontext bereit. Seien Sie für die besten Ergebnisse so spezifisch wie möglich.',
    placeholder: 'z.B., Eine React-Komponente für ein Anmeldeformular mit E-Mail- und Passwortfeldern unter Verwendung von TypeScript und Tailwind CSS.',
    button: 'Code Generieren',
    generatedCode: 'Generierter Code:',
    error: 'Bitte geben Sie eine Beschreibung für den Code ein, den Sie generieren möchten.',
    errorFailed: 'Code konnte nicht generiert werden. Bitte versuchen Sie es erneut.',
    uploadButton: 'Dateien Hochladen oder Drag & Drop',
    contextFiles: 'Kontextdateien:',
  },
  [Language.JAPANESE]: {
    title: 'コードジェネレーター',
    description: '必要なコードを説明すると、AIがそれを生成します。コンテキストのためにファイルを提供してください。最良の結果を得るために、できるだけ具体的に記述してください。',
    placeholder: '例：TypeScriptとTailwind CSSを使用した、メールアドレスとパスワードのフィールドを持つログインフォーム用のReactコンポーネント。',
    button: 'コードを生成',
    generatedCode: '生成されたコード：',
    error: '生成したいコードの説明を入力してください。',
    errorFailed: 'コードの生成に失敗しました。もう一度お試しください。',
    uploadButton: 'ファイルをアップロードまたはドラッグ＆ドロップ',
    contextFiles: 'コンテキストファイル：',
  }
};


const CodeGenerator: React.FC = () => {
  const { language } = useAppContext();
  const t = translations[language];
  const { transcript, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeech(language);
  
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileStatuses, setFileStatuses] = useState<FileStatus>({});
  const [generatedCode, setGeneratedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isListening) setPrompt(transcript);
  }, [transcript, isListening]);

  const processFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    setFiles(prev => [...prev, ...newFiles]);
    const newStatuses: FileStatus = {};
    newFiles.forEach(file => { newStatuses[file.name + file.lastModified] = 'processing'; });
    setFileStatuses(prev => ({ ...prev, ...newStatuses }));
    
    setTimeout(() => {
        const successStatuses: FileStatus = {};
        newFiles.forEach(file => { successStatuses[file.name + file.lastModified] = 'success'; });
        setFileStatuses(prev => ({ ...prev, ...successStatuses }));
    }, 500);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragOver(true);
    else if (e.type === 'dragleave' || e.type === 'drop') setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f !== fileToRemove));
    setFileStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[fileToRemove.name + fileToRemove.lastModified];
        return newStatuses;
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError(t.error); return; }
    setIsLoading(true);
    setError('');
    setGeneratedCode('');
    try {
      const code = await generateCode(prompt, language, files);
      setGeneratedCode(code);
    } catch (err) {
      setError(t.errorFailed);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop}>
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">{t.title}</h2>
        <p className="text-text-secondary mb-6">{t.description}</p>
        
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.placeholder}
              className="w-full h-28 p-3 bg-background border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary pr-12"
              disabled={isLoading}
            />
            {hasRecognitionSupport && (
              <div className="absolute top-3 right-3 flex flex-col items-center">
                 <button onClick={() => isListening ? stopListening() : startListening()} title={isListening ? 'Stop listening' : 'Start voice input'}
                  className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-gray-100 text-secondary'}`} disabled={isLoading}>
                  {isListening ? ICONS.stop : ICONS.microphone}
                </button>
              </div>
            )}
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragOver ? 'border-primary bg-teal-50' : 'border-border-color hover:bg-gray-50'}`}
            >
              <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <div className="text-primary mb-2">{ICONS.upload}</div>
              <p className="text-text-primary font-semibold">{t.uploadButton}</p>
          </div>
          
          {files.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-secondary mb-2">{t.contextFiles}</h4>
              <div className="flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={index} className="bg-gray-100 rounded-full px-3 py-1 text-sm text-text-secondary flex items-center gap-2 border border-border-color">
                    {fileStatuses[file.name + file.lastModified] === 'processing' && <Spinner className="h-4 w-4 border-gray-400"/>}
                    {fileStatuses[file.name + file.lastModified] === 'success' && <div className="text-green-500">{ICONS.check}</div>}
                    <span>{file.name}</span>
                    <button onClick={() => removeFile(file)} className="text-gray-400 hover:text-text-primary" title={`Remove ${file.name}`}>
                      {ICONS.close}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? <Spinner className="h-6 w-6 border-white" /> : t.button}
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        
        {generatedCode && (
          <div className="mt-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-text-primary">{t.generatedCode}</h3>
            <CodeBlock code={generatedCode} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default CodeGenerator;