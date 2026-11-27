/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState } from 'react';
import { obtenerPrecioPublico } from '../utils/catalogoPublico';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [carrito, setCarrito] = useState([]);

  const agregarAlCarrito = (producto) => {
    setCarrito((prevCarrito) => {
      // Verificamos si el producto ya está en el carrito
      const itemExiste = prevCarrito.find((item) => item.id === producto.id);
      
      if (itemExiste) {
        // Si existe, le sumamos 1 a la cantidad
        return prevCarrito.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      // Si no existe, lo agregamos con cantidad 1
      return [...prevCarrito, { ...producto, cantidad: 1 }];
    });
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prevCarrito) => prevCarrito.filter((item) => item.id !== id));
  };

  const vaciarCarrito = () => {
    setCarrito([]);
  };

  // Calculamos el total usando el precio público redondeado
  const totalCarrito = carrito.reduce(
    (total, item) => total + (obtenerPrecioPublico(item) * item.cantidad),
    0
  );

  // Calculamos cuántos ítems hay en total para el icono flotante
  const cantidadTotal = carrito.reduce((total, item) => total + item.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        carrito,
        agregarAlCarrito,
        eliminarDelCarrito,
        vaciarCarrito,
        totalCarrito,
        cantidadTotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};