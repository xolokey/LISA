import React, { useState } from 'react';
import { InvoiceData } from '../types';
import { parseInvoice } from '../services/geminiService';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { useAppContext } from '../context/AppContext';
import { Language } from '../types';
import { ICONS } from '../constants';

const translations = {
    [Language.ENGLISH]: {
        title: "Invoice Parser",
        description: "Upload an image of an invoice (.png, .jpg, .webp), and the AI will automatically extract the key information.",
        button: "Parse Invoice",
        errorSelect: "Please select an invoice image to parse.",
        errorParse: "Failed to parse the invoice. Please try a clearer image or a different file.",
        extractedData: "Extracted Data",
        placeholder: "Extracted invoice data will appear here.",
        invoiceId: "Invoice ID:",
        vendor: "Vendor:",
        customer: "Customer:",
        date: "Date:",
        totalAmount: "Total Amount:",
        items: "Items:",
        itemDescription: "Description",
        itemQty: "Qty",
        itemPrice: "Price",
        itemTotal: "Total",
        uploadPrompt: "Click to upload or drag & drop",
    },
    [Language.TAMIL]: {
        title: "விலைப்பட்டியல் பாகுபடுத்தி",
        description: "விலைப்பட்டியலின் ஒரு படத்தைப் பதிவேற்றவும் (.png, .jpg, .webp), மற்றும் AI தானாகவே முக்கிய தகவலைப் பிரித்தெடுக்கும்.",
        button: "விலைப்பட்டியலைப் பாகுபடுத்து",
        errorSelect: "பாகுபடுத்த ஒரு விலைப்பட்டியல் படத்தைத் தேர்ந்தெடுக்கவும்.",
        errorParse: "விலைப்பட்டியலைப் பாகுபடுத்த முடியவில்லை. தெளிவான படம் அல்லது வேறு கோப்பை முயற்சிக்கவும்.",
        extractedData: "பிரித்தெடுக்கப்பட்ட தரவு",
        placeholder: "பிரித்தெடுக்கப்பட்ட விலைப்பட்டியல் தரவு இங்கே தோன்றும்.",
        invoiceId: "விலைப்பட்டியல் ஐடி:",
        vendor: "விற்பனையாளர்:",
        customer: "வாடிக்கையாளர்:",
        date: "தேதி:",
        totalAmount: "மொத்த தொகை:",
        items: "பொருட்கள்:",
        itemDescription: "விளக்கம்",
        itemQty: "அளவு",
        itemPrice: "விலை",
        itemTotal: "மொத்தம்",
        uploadPrompt: "பதிவேற்ற கிளிக் செய்யவும் அல்லது இழுத்து விடவும்",
    },
    [Language.HINDI]: {
        title: "इनवॉइस पार्सर",
        description: "इनवॉइस की एक छवि (.png, .jpg, .webp) अपलोड करें, और AI स्वचालित रूप से मुख्य जानकारी निकाल लेगा।",
        button: "इनवॉइस पार्स करें",
        errorSelect: "पार्स करने के लिए कृपया एक इनवॉइस छवि चुनें।",
        errorParse: "इनवॉइस पार्स करने में विफल। कृपया एक स्पष्ट छवि या एक अलग फ़ाइल का प्रयास करें।",
        imagePreview: "छवि पूर्वावलोकन:",
        extractedData: "निकाला गया डेटा",
        placeholder: "निकाला गया इनवॉइस डेटा यहां दिखाई देगा।",
        invoiceId: "इनवॉइस आईडी:",
        vendor: "विक्रेता:",
        customer: "ग्राहक:",
        date: "तारीख:",
        totalAmount: "कुल राशि:",
        items: "आइटम:",
        itemDescription: "विवरण",
        itemQty: "मात्रा",
        itemPrice: "कीमत",
        itemTotal: "कुल",
        uploadPrompt: "अपलोड करने के लिए क्लिक करें या खींचें और छोड़ें",
    },
    [Language.SPANISH]: {
        title: "Analizador de Facturas",
        description: "Sube una imagen de una factura (.png, .jpg, .webp), y la IA extraerá automáticamente la información clave.",
        button: "Analizar Factura",
        errorSelect: "Por favor, selecciona una imagen de factura para analizar.",
        errorParse: "No se pudo analizar la factura. Por favor, intenta con una imagen más clara o un archivo diferente.",
        extractedData: "Datos Extraídos",
        placeholder: "Los datos extraídos de la factura aparecerán aquí.",
        invoiceId: "ID de Factura:",
        vendor: "Vendedor:",
        customer: "Cliente:",
        date: "Fecha:",
        totalAmount: "Monto Total:",
        items: "Artículos:",
        itemDescription: "Descripción",
        itemQty: "Cant.",
        itemPrice: "Precio",
        itemTotal: "Total",
        uploadPrompt: "Haz clic para subir o arrastrar y soltar",
    },
    [Language.FRENCH]: {
        title: "Analyseur de Factures",
        description: "Téléchargez une image d'une facture (.png, .jpg, .webp), et l'IA extraira automatiquement les informations clés.",
        button: "Analyser la Facture",
        errorSelect: "Veuillez sélectionner une image de facture à analyser.",
        errorParse: "Impossible d'analyser la facture. Veuillez essayer avec une image plus nette ou un autre fichier.",
        extractedData: "Données Extraites",
        placeholder: "Les données extraites de la facture apparaîtront ici.",
        invoiceId: "ID de Facture :",
        vendor: "Vendeur :",
        customer: "Client :",
        date: "Date :",
        totalAmount: "Montant Total :",
        items: "Articles :",
        itemDescription: "Description",
        itemQty: "Qté",
        itemPrice: "Prix",
        itemTotal: "Total",
        uploadPrompt: "Cliquez pour télécharger ou glisser-déposer",
    },
    [Language.GERMAN]: {
        title: "Rechnungs-Parser",
        description: "Laden Sie ein Bild einer Rechnung (.png, .jpg, .webp) hoch, und die KI extrahiert automatisch die wichtigsten Informationen.",
        button: "Rechnung Analysieren",
        errorSelect: "Bitte wählen Sie ein Rechnungsbild zum Analysieren aus.",
        errorParse: "Die Rechnung konnte nicht analysiert werden. Bitte versuchen Sie es mit einem klareren Bild oder einer anderen Datei.",
        extractedData: "Extrahierte Daten",
        placeholder: "Extrahierte Rechnungsdaten werden hier angezeigt.",
        invoiceId: "Rechnungs-ID:",
        vendor: "Verkäufer:",
        customer: "Kunde:",
        date: "Datum:",
        totalAmount: "Gesamtbetrag:",
        items: "Positionen:",
        itemDescription: "Beschreibung",
        itemQty: "Menge",
        itemPrice: "Preis",
        itemTotal: "Gesamt",
        uploadPrompt: "Zum Hochladen klicken oder ziehen und ablegen",
    },
    [Language.JAPANESE]: {
        title: "請求書パーサー",
        description: "請求書の画像（.png、.jpg、.webp）をアップロードすると、AIが自動的に主要な情報を抽出します。",
        button: "請求書を解析",
        errorSelect: "解析する請求書の画像を選択してください。",
        errorParse: "請求書の解析に失敗しました。より鮮明な画像または別のファイルでお試しください。",
        extractedData: "抽出されたデータ",
        placeholder: "抽出された請求書データはここに表示されます。",
        invoiceId: "請求書ID：",
        vendor: "ベンダー：",
        customer: "顧客：",
        date: "日付：",
        totalAmount: "合計金額：",
        items: "項目：",
        itemDescription: "説明",
        itemQty: "数量",
        itemPrice: "価格",
        itemTotal: "合計",
        uploadPrompt: "クリックしてアップロードまたはドラッグ＆ドロップ",
    },
};


const InvoiceParser: React.FC = () => {
  const { language } = useAppContext();
  const t = translations[language];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setInvoiceData(null);
      setError('');
    }
  };

  const handleParse = async () => {
    if (!selectedFile) {
      setError(t.errorSelect);
      return;
    }
    setIsLoading(true);
    setError('');
    setInvoiceData(null);
    try {
      const data = await parseInvoice(selectedFile);
      setInvoiceData(data);
    } catch (err) {
      setError(t.errorParse);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h2 className="text-2xl font-bold mb-2 text-text-primary">{t.title}</h2>
        <p className="text-text-secondary mb-6">{t.description}</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-border-color border-dashed rounded-lg cursor-pointer bg-background hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {previewUrl ? (
                         <img src={previewUrl} alt="Invoice preview" className="rounded-md max-h-48 w-auto" />
                    ): (
                        <>
                         <div className="text-primary mb-4">{ICONS.upload}</div>
                         <p className="mb-2 text-sm text-text-secondary"><span className="font-semibold text-text-primary">{t.uploadPrompt}</span></p>
                         <p className="text-xs text-secondary">PNG, JPG, WEBP, HEIC, or HEIF</p>
                        </>
                    )}
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/heic, image/heif" onChange={handleFileChange} disabled={isLoading} />
            </label>
        </div>
        
          <button onClick={handleParse} disabled={!selectedFile || isLoading} title={t.button}
            className="w-full bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {isLoading ? <Spinner className="h-6 w-6 border-white" /> : t.button}
          </button>
        </div>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </Card>

      <Card className={`transition-all duration-300 ${!invoiceData && !isLoading ? 'flex items-center justify-center' : ''}`}>
        {isLoading ? <div className="flex justify-center items-center h-full"><Spinner className="h-12 w-12 border-primary" /></div> : invoiceData ? (
          <div className="animate-fadeIn">
            <h3 className="text-2xl font-bold mb-4 text-text-primary">{t.extractedData}</h3>
            <div className="grid grid-cols-2 gap-4 text-text-secondary mb-4">
                <div><strong className="text-text-primary">{t.invoiceId}</strong> <p>{invoiceData.invoiceId || 'N/A'}</p></div>
                <div><strong className="text-text-primary">{t.date}</strong> <p>{invoiceData.invoiceDate || 'N/A'}</p></div>
                <div><strong className="text-text-primary">{t.vendor}</strong> <p>{invoiceData.vendorName || 'N/A'}</p></div>
                <div><strong className="text-text-primary">{t.customer}</strong> <p>{invoiceData.customerName || 'N/A'}</p></div>
            </div>
            <div className="bg-background p-4 rounded-lg my-4 border border-border-color">
                <p className="text-lg font-bold text-text-primary"><strong>{t.totalAmount}</strong></p>
                <p className="text-3xl font-bold text-primary">{invoiceData.totalAmount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
                <h4 className="font-semibold text-lg mb-2 text-text-primary">{t.items}</h4>
                <div className="overflow-x-auto max-h-60 border border-border-color rounded-lg">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-background text-text-secondary sticky top-0">
                            <tr>
                                <th className="px-4 py-2">{t.itemDescription}</th>
                                <th className="px-4 py-2 text-center">{t.itemQty}</th>
                                <th className="px-4 py-2 text-right">{t.itemPrice}</th>
                                <th className="px-4 py-2 text-right">{t.itemTotal}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {invoiceData.items?.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{item.description}</td>
                                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right">{item.unitPrice?.toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-medium text-text-primary">{item.total?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        ) : (
          <p className="text-secondary text-center">{t.placeholder}</p>
        )}
      </Card>
    </div>
  );
};

export default InvoiceParser;