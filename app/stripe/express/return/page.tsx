export default function StripeReturn() {
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
        border: '2px solid #10b981',
        borderRadius: '12px',
        backgroundColor: '#f0fdf4'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
        <h1 style={{ color: '#059669', marginBottom: '16px' }}>
          ¡Cuenta Activada Exitosamente!
        </h1>
        <p style={{ color: '#374151', marginBottom: '24px' }}>
          Tu cuenta de Stripe Express ha sido configurada correctamente.
          Ya puedes recibir pagos en tu aplicación.
        </p>
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #d1fae5',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: '#059669', marginBottom: '8px' }}>
            🎉 ¿Qué sigue?
          </h3>
          <ul style={{ 
            textAlign: 'left', 
            color: '#374151',
            paddingLeft: '20px' 
          }}>
            <li>Tu sistema de pagos está listo</li>
            <li>Puedes procesar pagos inmediatamente</li>
            <li>Los fondos se depositarán en tu cuenta bancaria</li>
          </ul>
        </div>
        <button
          onClick={() => {
            // Marcar como configurado y redirigir
            localStorage.setItem('stripe-configured', 'true');
            window.location.href = '/';
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
          🏠 Volver al Inicio
        </button>
        <button
          onClick={() => {
            window.location.href = '/stripe/express';
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
          ⚙️ Ver Configuración
        </button>
      </div>
    </div>
  );
}
