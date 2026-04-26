// src/components/admin/QRModal.jsx
import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import * as htmlToImage from "html-to-image";
import { X, Download, RefreshCw } from "lucide-react";

export default function QRModal({ residentId, qrCodeData, name, unit, onRegenerate, onClose }) {
  const qrRef = useRef(null);

  const downloadQR = () => {
    if (!qrRef.current) return;
    htmlToImage.toPng(qrRef.current, { backgroundColor: "#ffffff", pixelRatio: 3 })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `QR_${residentId}.png`;
        link.href = dataUrl;
        link.click();
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xs shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-900">{name}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Unit {unit}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* QR */}
        <div className="flex justify-center py-8 px-6">
          <div ref={qrRef} className="bg-white p-4 border border-gray-100 rounded-xl">
            <QRCodeCanvas
              value={qrCodeData || residentId}
              size={200}
              level="H"
            />
          </div>
        </div>

        {/* Resident ID */}
        <div className="text-center pb-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Resident ID</p>
          <p className="text-sm font-mono font-bold tracking-wider text-gray-900">{residentId}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={downloadQR}
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-lg"
          >
            <Download size={13} /> Download
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center justify-center gap-2 border border-gray-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest hover:bg-gray-50 transition-colors rounded-lg text-gray-600"
            title="Regenerate QR"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}