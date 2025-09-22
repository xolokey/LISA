import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import Spinner from './common/Spinner';
import CodeBlock from './common/CodeBlock';
import { generatePipeline } from '../services/geminiService';
import { useAppContext } from '../context/AppContext';
import { Language } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import { ICONS } from '../constants';

const translations = {
    [Language.ENGLISH]: {
        title: 'CI/CD Pipeline Generator',
        description: 'Configure your pipeline and let the AI generate the YAML configuration for you. Supports GitHub Actions and Azure DevOps.',
        projectNameLabel: 'Project Name',
        projectNamePlaceholder: 'e.g., my-react-app',
        pipelineTypeLabel: 'Pipeline Type',
        githubActions: 'GitHub Actions',
        azureDevops: 'Azure DevOps',
        button: 'Generate Pipeline',
        generatedYaml: 'Generated YAML:',
        error: 'Please enter a project name.',
        errorFailed: 'Failed to generate pipeline YAML. Please try again.'
    },
    [Language.TAMIL]: {
        title: 'CI/CD பைப்லைன் ஜெனரேட்டர்',
        description: 'உங்கள் பைப்லைனை உள்ளமைத்து, AI உங்களுக்காக YAML உள்ளமைப்பை உருவாக்கட்டும். GitHub Actions மற்றும் Azure DevOps ஐ ஆதரிக்கிறது.',
        projectNameLabel: 'திட்டத்தின் பெயர்',
        projectNamePlaceholder: 'எ.கா., my-react-app',
        pipelineTypeLabel: 'பைப்லைன் வகை',
        githubActions: 'கிட்ஹப் ஆக்சன்ஸ்',
        azureDevops: 'அஸூர் டெவொப்ஸ்',
        button: 'பைப்லைனை உருவாக்கு',
        generatedYaml: 'உருவாக்கப்பட்ட YAML:',
        error: 'திட்டத்தின் பெயரை உள்ளிடவும்.',
        errorFailed: 'பைப்லைன் YAMLஐ உருவாக்கத் தவறிவிட்டது. மீண்டும் முயக்கவும்.'
    },
    [Language.HINDI]: {
        title: 'CI/CD पाइपलाइन जेनरेटर',
        description: 'अपनी पाइपलाइन कॉन्फ़िगर करें और AI को आपके लिए YAML कॉन्फ़िगरेशन बनाने दें। GitHub Actions और Azure DevOps का समर्थन करता है।',
        projectNameLabel: 'परियोजना का नाम',
        projectNamePlaceholder: 'उदा., my-react-app',
        pipelineTypeLabel: 'पाइपलाइन प्रकार',
        githubActions: 'गिटहब एक्शन्स',
        azureDevops: 'एज़्योर डेवऑप्स',
        button: 'पाइपलाइन जेनरेट करें',
        generatedYaml: 'जेनरेट किया गया YAML:',
        error: 'कृपया एक परियोजना नाम दर्ज करें।',
        errorFailed: 'पाइपलाइन YAML जेनरेट करने में विफल। कृपया पुन: प्रयास करें।'
    },
    [Language.SPANISH]: {
        title: 'Generador de Pipeline CI/CD',
        description: 'Configura tu pipeline y deja que la IA genere la configuración YAML por ti. Soporta GitHub Actions y Azure DevOps.',
        projectNameLabel: 'Nombre del Proyecto',
        projectNamePlaceholder: 'ej., mi-app-react',
        pipelineTypeLabel: 'Tipo de Pipeline',
        githubActions: 'GitHub Actions',
        azureDevops: 'Azure DevOps',
        button: 'Generar Pipeline',
        generatedYaml: 'YAML Generado:',
        error: 'Por favor, introduce un nombre de proyecto.',
        errorFailed: 'No se pudo generar el YAML del pipeline. Por favor, inténtalo de nuevo.'
    },
    [Language.FRENCH]: {
        title: 'Générateur de Pipeline CI/CD',
        description: 'Configurez votre pipeline et laissez l\'IA générer la configuration YAML pour vous. Prend en charge GitHub Actions et Azure DevOps.',
        projectNameLabel: 'Nom du Projet',
        projectNamePlaceholder: 'ex., mon-app-react',
        pipelineTypeLabel: 'Type de Pipeline',
        githubActions: 'GitHub Actions',
        azureDevops: 'Azure DevOps',
        button: 'Générer le Pipeline',
        generatedYaml: 'YAML Généré :',
        error: 'Veuillez saisir un nom de projet.',
        errorFailed: 'Échec de la génération du YAML du pipeline. Veuillez réessayer.'
    },
    [Language.GERMAN]: {
        title: 'CI/CD-Pipeline-Generator',
        description: 'Konfigurieren Sie Ihre Pipeline und lassen Sie die KI die YAML-Konfiguration für Sie generieren. Unterstützt GitHub Actions und Azure DevOps.',
        projectNameLabel: 'Projektname',
        projectNamePlaceholder: 'z.B., meine-react-app',
        pipelineTypeLabel: 'Pipeline-Typ',
        githubActions: 'GitHub Actions',
        azureDevops: 'Azure DevOps',
        button: 'Pipeline Generieren',
        generatedYaml: 'Generiertes YAML:',
        error: 'Bitte geben Sie einen Projektnamen ein.',
        errorFailed: 'Pipeline-YAML konnte nicht generiert werden. Bitte versuchen Sie es erneut.'
    },
    [Language.JAPANESE]: {
        title: 'CI/CDパイプラインジェネレーター',
        description: 'パイプラインを設定し、AIにYAML設定を生成させます。GitHub ActionsとAzure DevOpsをサポートしています。',
        projectNameLabel: 'プロジェクト名',
        projectNamePlaceholder: '例：my-react-app',
        pipelineTypeLabel: 'パイプラインタイプ',
        githubActions: 'GitHub Actions',
        azureDevops: 'Azure DevOps',
        button: 'パイプラインを生成',
        generatedYaml: '生成されたYAML：',
        error: 'プロジェクト名を入力してください。',
        errorFailed: 'パイプラインYAMLの生成に失敗しました。もう一度お試しください。'
    }
};

const PipelineGenerator: React.FC = () => {
  const { language } = useAppContext();
  const t = translations[language];
  const { transcript, isListening, startListening, stopListening, hasRecognitionSupport } = useSpeech(language);

  const [projectName, setProjectName] = useState('my-awesome-project');
  const [pipelineType, setPipelineType] = useState<'github' | 'azure'>('github');
  const [generatedYaml, setGeneratedYaml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isListening) setProjectName(transcript);
  }, [transcript, isListening]);

  const handleGenerate = async () => {
    if (!projectName.trim()) { setError(t.error); return; }
    setIsLoading(true);
    setError('');
    setGeneratedYaml('');
    try {
      const yaml = await generatePipeline(pipelineType, projectName, language);
      setGeneratedYaml(yaml);
    } catch (err) {
      setError(t.errorFailed);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">{t.title}</h2>
        <p className="text-text-secondary mb-6">{t.description}</p>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-text-secondary mb-2">{t.projectNameLabel}</label>
            <div className="relative">
              <input id="projectName" type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                placeholder={t.projectNamePlaceholder}
                className="w-full p-3 bg-background border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary pr-10"
                disabled={isLoading}
              />
              {hasRecognitionSupport && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                       <button onClick={() => isListening ? stopListening() : startListening()} title={isListening ? 'Stop listening' : 'Start voice input'}
                          className={`p-2 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-secondary hover:text-primary'}`}>
                          {isListening ? ICONS.stop : ICONS.microphone}
                      </button>
                  </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t.pipelineTypeLabel}</label>
            <div className="flex space-x-2 bg-background p-1 rounded-lg border border-border-color">
              <button onClick={() => setPipelineType('github')} disabled={isLoading} title="Generate for GitHub Actions"
                className={`flex-1 py-2 px-4 rounded-md transition-all text-sm font-semibold ${pipelineType === 'github' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-gray-100'}`}>
                {t.githubActions}
              </button>
              <button onClick={() => setPipelineType('azure')} disabled={isLoading} title="Generate for Azure DevOps"
                className={`flex-1 py-2 px-4 rounded-md transition-all text-sm font-semibold ${pipelineType === 'azure' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-gray-100'}`}>
                {t.azureDevops}
              </button>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={isLoading || !projectName} title={t.button}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? <Spinner className="h-6 w-6 border-white"/> : t.button}
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        
        {generatedYaml && (
          <div className="mt-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-text-primary">{t.generatedYaml}</h3>
            <CodeBlock code={generatedYaml} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default PipelineGenerator;