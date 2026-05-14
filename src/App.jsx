import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Catalogo from './pages/Catalogo';
import AdminPanel from './pages/AdminPanel';
import { CartProvider } from './context/CartContext';
import CarritoFlotante from './components/CarritoFlotante'; // <-- 1. Importamos el componente
import './App.css'; 

function App() {
  return (
    <CartProvider>
      <Router>
        {/* 2. Colocamos el CarritoFlotante aquí. 
            Al estar fuera de las rutas, siempre estará visible y flotando 
            si hay productos adentro, sin importar en qué página estés. */}
        <CarritoFlotante /> 

        <Routes>
          {/* Ruta Pública para tus clientes */}
          <Route path="/" element={<Catalogo />} />
          
          {/* Ruta Privada para vos y tu socio */}
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;