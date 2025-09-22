import React from 'react';
import Modal from './common/Modal';
import { FileSearchResult } from '../types';
import Spinner from './common/Spinner';
import { ICONS } from '../constants';

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: FileSearchResult | null;
  isLoading: boolean;
  query: string;
}

const getFileIcon = (type: FileSearchResult['files'][0]['type']) => {
    switch (type) {
        case 'pdf': return ICONS.filePdf;
        case 'doc': return ICONS.fileDoc;
        case 'code': return ICONS.fileCode;
        default: return ICONS.fileGeneric;
    }
};

const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ isOpen, onClose, results, isLoading, query }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Search Results for "${query}"`}>
      {isLoading && (
        <div className="flex justify-center items-center h-48">
          <Spinner className="h-12 w-12 border-primary" />
        </div>
      )}
      {results && !isLoading && (
        <div className="space-y-4">
          <p className="text-text-secondary">{results.summary}</p>
          {results.files.length > 0 && (
            <div className="space-y-2">
              {results.files.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border-color hover:border-primary/50 hover:bg-teal-50 transition-all duration-200 cursor-pointer">
                  <div className="text-primary flex-shrink-0 text-2xl">{getFileIcon(file.type)}</div>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-text-primary truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-secondary truncate" title={file.path}>{file.path}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default SearchResultsModal;