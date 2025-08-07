'use client';

export default function StripeRefresh() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px',
        padding: '40px',
        border: '2px solid #f59e0b',
        borderRadius: '12px',
        backgroundColor: '#fffbeb'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <h1 style={{ color: '#d97706', marginBottom: '16px' }}>
          Proceso Interrumpido
        </h1>
        <p style={{ color: '#374151', marginBottom: '24px' }}>
          El proceso de configuración de Stripe fue interrumpido.
          No te preocupes, puedes intentarlo nuevamente.
        </p>
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: '#d97706', marginBottom: '8px' }}>
            🔄 ¿Qué hacer?
          </h3>
          <ul style={{ 
            textAlign: 'left', 
            color: '#374151',
            paddingLeft: '20px' 
          }}>
            <li>Intenta el proceso nuevamente</li>
            <li>Asegúrate de tener todos los documentos listos</li>
            <li>Verifica tu conexión a internet</li>
          </ul>
        </div>
        <button
          onClick={() => {
            window.location.href = '/stripe/express';
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginRight: '12px'
          }}
        >
          🔄 Intentar Nuevamente
        </button>
        <button
          onClick={() => {
            window.location.href = '/';
          }}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🏠 Volver al Inicio
        </button>
      </div>
    </div>
  );
}
