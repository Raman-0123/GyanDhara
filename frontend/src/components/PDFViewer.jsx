import { useEffect } from 'react';

const PDFViewer = ({ pdfUrl, isOpen, onClose }) => {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
            <div className="relative w-full h-full max-w-7xl max-h-[95vh] m-4" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-80 p-4 flex items-center justify-between">
                    <h3 className="text-white font-semibold text-lg">PDF Viewer</h3>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-colors"
                        title="Close (ESC)"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="w-full h-full bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-full"
                        title="PDF Document"
                        style={{ border: 'none' }}
                        loading="eager"
                        allow="clipboard-read; clipboard-write"
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>
        </div>
    );
};

export default PDFViewer;
