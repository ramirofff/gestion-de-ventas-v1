"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SimpleThankYouPage() {
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    const id = searchParams.get('session_id');
    if (id) {
      setSessionId(id);
    }
  }, [searchParams]);

  return (
    <html lang="es">
      <head>
        <title>¡Gracias por tu compra!</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
          }
          
          .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 1s ease-in-out;
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          
          .title {
            color: #2d3748;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 16px;
          }
          
          .subtitle {
            color: #718096;
            font-size: 18px;
            margin-bottom: 30px;
          }
          
          .status-badge {
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 30px;
            display: inline-block;
          }
          
          .info-box {
            background: #f7fafc;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .info-title {
            color: #4a5568;
            font-weight: 600;
            margin-bottom: 10px;
            font-size: 14px;
          }
          
          .transaction-id {
            color: #2b6cb0;
            font-family: monospace;
            font-size: 12px;
            background: #bee3f8;
            padding: 8px 12px;
            border-radius: 8px;
            word-break: break-all;
          }
          
          .instructions {
            background: #e6fffa;
            border: 2px solid #81e6d9;
            border-radius: 12px;
            padding: 20px;
            margin-top: 20px;
          }
          
          .instructions-title {
            color: #234e52;
            font-weight: 600;
            margin-bottom: 12px;
            font-size: 16px;
          }
          
          .instructions-text {
            color: #2c7a7b;
            font-size: 14px;
            line-height: 1.5;
          }
          
          .footer {
            margin-top: 30px;
            color: #a0aec0;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .close-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
            transition: transform 0.2s;
          }
          
          .close-btn:hover {
            transform: scale(1.05);
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="success-icon">🎉</div>
          
          <h1 className="title">¡Gracias por tu compra!</h1>
          <p className="subtitle">Tu pago se ha procesado exitosamente</p>
          
          <div className="status-badge">
            ✅ Pago Confirmado
          </div>
          
          <div className="info-box">
            <div className="info-title">ID de Transacción:</div>
            <div className="transaction-id">
              {sessionId.slice(-12) || 'Procesando...'}
            </div>
          </div>
          
          <div className="instructions">
            <div className="instructions-title">📧 Confirmación</div>
            <div className="instructions-text">
              • Tu compra ha sido procesada correctamente<br/>
              • El vendedor ha sido notificado del pago<br/>
              • Recibirás un comprobante por email (si proporcionaste uno)<br/>
              • Guarda esta pantalla como referencia
            </div>
          </div>
          
          <button 
            className="close-btn" 
            onclick="window.close() || (window.location.href = 'about:blank')"
          >
            Cerrar Ventana
          </button>
          
          <div className="footer">
            Procesado de forma segura con Stripe<br/>
            Sistema de Gestión de Ventas v1.0<br/>
            © 2025 - Todos los derechos reservados
          </div>
        </div>
        
        <script>
          // Auto-cerrar después de 30 segundos si es posible
          setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.log('No se puede cerrar automáticamente');
            }
          }, 30000);
          
          // Enviar mensaje al vendedor si la ventana padre existe
          try {
            if (window.opener && !window.opener.closed) {
              const sessionId = new URLSearchParams(window.location.search).get('session_id');
              window.opener.postMessage({
                type: 'PAYMENT_COMPLETED_FROM_QR',
                sessionId: sessionId,
                timestamp: new Date().toISOString()
              }, window.location.origin);
            }
          } catch (e) {
            console.log('No se puede comunicar con ventana padre');
          }
        </script>
      </body>
    </html>
  );
}
