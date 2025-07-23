import { motion } from 'framer-motion';

interface QRDisplayProps {
  value: string;
  size?: number;
  onClose?: () => void;
}

export function QRDisplay({ value, size = 192, onClose }: QRDisplayProps) {
  // Usar API pública para generar QR
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div className="bg-white rounded-xl p-8 flex flex-col items-center shadow-2xl">
        <img src={qrUrl} alt="QR de pago" style={{ width: size, height: size }} className="mb-4" />
        {onClose && (
          <button
            className="mt-2 px-6 py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
            onClick={onClose}
          >
            Cerrar
          </button>
        )}
      </div>
    </motion.div>
  );
}
