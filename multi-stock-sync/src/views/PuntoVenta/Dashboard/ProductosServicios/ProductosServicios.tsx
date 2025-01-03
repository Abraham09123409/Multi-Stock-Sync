import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faDollarSign, faBoxes } from '@fortawesome/free-solid-svg-icons';
import Modal from '../../../../components/Modal/Modal';
import './ProductosServicios.css';

interface ProductosServiciosProps {
    searchQuery: string;
    onAddToCart: (product: { id: number; nombre: string; cantidad: number; precio: number }) => void;
}

const ProductosServicios: React.FC<ProductosServiciosProps> = ({ searchQuery, onAddToCart }) => {
    const productos = [
        { id: 1, nombre: 'Producto A', cantidad: 10, precio: 1000 },
        { id: 2, nombre: 'Producto B', cantidad: 5, precio: 2000 },
        { id: 3, nombre: 'Producto C', cantidad: 7, precio: 1500 },
        { id: 4, nombre: 'Producto D', cantidad: 2, precio: 500 },
    ];

    const [filteredProductos, setFilteredProductos] = useState(productos);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{ id: number; nombre: string; cantidad: number; precio: number } | null>(null);

    useEffect(() => {
        if (searchQuery) {
            setFilteredProductos(
                productos.filter((producto) =>
                    producto.nombre.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredProductos(productos);
        }
    }, [searchQuery]);

    const handleShowPriceModal = (product: { id: number; nombre: string; cantidad: number; precio: number }) => {
        setSelectedProduct(product);
        setShowPriceModal(true);
    };

    const handleShowStockModal = (product: { id: number; nombre: string; cantidad: number; precio: number }) => {
        setSelectedProduct(product);
        setShowStockModal(true);
    };

    return (
        <>
        <h2 className="destacados-header">
            <FontAwesomeIcon icon={faBoxes} className="header-icon" /> Productos/Servicios
        </h2>
        <ul className="productos-list">
                {filteredProductos.map((producto) => (
                    <li key={producto.id} className="producto-item">
                        <span>{producto.nombre}</span>
                        <span>${producto.precio.toLocaleString()}</span>
                        <div className="producto-actions">
                            <button
                                className="btn btn-info"
                                onClick={() => handleShowPriceModal(producto)}
                            >
                                <FontAwesomeIcon icon={faDollarSign} />
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => onAddToCart(producto)}
                            >
                                <FontAwesomeIcon icon={faPlusCircle} />
                            </button>
                            <button
                                className="btn btn-warning"
                                onClick={() => handleShowStockModal(producto)}
                            >
                                <FontAwesomeIcon icon={faBoxes} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
            <Modal show={showPriceModal} onClose={() => setShowPriceModal(false)} title="Consultar Precio">
                <p>Precio del producto: ${selectedProduct?.precio.toLocaleString()}</p>
            </Modal>
            <Modal show={showStockModal} onClose={() => setShowStockModal(false)} title="Consultar Stock">
                <p>Stock del producto: {selectedProduct?.cantidad}</p>
            </Modal>
        </>
    );
};

export default ProductosServicios;
