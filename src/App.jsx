import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Catalogo from './pages/Catalogo';
import AdminPanel from './pages/AdminPanel';
import './App.css'; // Aquí pondremos los estilos neón

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta Pública para tus clientes */}
        <Route path="/" element={<Catalogo />} />
        
        {/* Ruta Privada para ti y tu socio */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;