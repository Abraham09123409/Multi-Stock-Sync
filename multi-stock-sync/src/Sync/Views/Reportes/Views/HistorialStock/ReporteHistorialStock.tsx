import React, { useState, useEffect, useCallback, useMemo } from "react";
// Importa React y hooks para manejar estado (useState), efectos secundarios (useEffect), 
// memoización de funciones (useCallback) y valores calculados (useMemo).

import { Table, Button, Modal, Alert, Form, Container, Row, Col, Card } from "react-bootstrap";
// Importa componentes de React-Bootstrap para construir la interfaz (tablas, botones, modales, etc.).

import { Link } from "react-router-dom";
// Permite navegar entre rutas en la aplicación.

import axiosInstance from "../../../../../axiosConfig";
// Importa una instancia configurada de Axios para hacer solicitudes HTTP a la API.

import { LoadingDinamico } from "../../../../../components/LoadingDinamico/LoadingDinamico";
// Componente personalizado para mostrar un indicador de carga.

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// Biblioteca para usar íconos.

import { faInfoCircle, faHistory, faSync, faChevronLeft, faChevronRight, faSearch, faSort, faTimes } from "@fortawesome/free-solid-svg-icons";
// Íconos específicos usados en la interfaz (info, historial, sincronizar, flechas, etc.).

import "bootstrap/dist/css/bootstrap.min.css";
// Estilos base de Bootstrap.

import styles from "./historialStock.module.css";
// Estilos personalizados específicos para este componente.

// Interfaces
interface SalesHistory {
  date: string;
  quantity: number;
}
// Define la estructura de un registro del historial de ventas: fecha y cantidad vendida.

interface Detail {
  id: string;
  name: string;
  value_id: string;
  value_name: string;
  values: { id: string; name: string; struct: null }[];
  value_type: string;
}
// Define detalles adicionales de un producto (como atributos específicos).

interface HistorialStock {
  id: string;
  title: string;
  available_quantity: number;
  stock_reload_date: string;
  purchase_sale_date: string;
  history: SalesHistory[];
  sku: string;
  details?: Detail[];
}
// Define la estructura de un producto en el historial de stock, con datos como ID, título, cantidad disponible, fechas, historial de ventas y detalles opcionales.

interface ClientData {
  nickname: string;
}
// Datos del cliente (solo el nickname por ahora).

interface Connection {
  client_id: string;
  nickname: string;
}
// Define una conexión a MercadoLibre con un ID y un nickname.

const API_BASE_URL = import.meta.env.VITE_API_URL;
// Obtiene la URL base de la API desde las variables de entorno (por ejemplo, .env).

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
// Opciones para cuántos elementos mostrar por página en la tabla.

const HistorialStock: React.FC = () => {
  // Define el componente como un Functional Component de React.

  // Estados del componente:
  const [historialStock, setHistorialStock] = useState<HistorialStock[]>([]);
  // Almacena la lista de productos con su historial de stock.

  const [loading, setLoading] = useState<boolean>(false);
  // Indica si los datos principales están cargando.

  const [error, setError] = useState<string | null>(null);
  // Almacena mensajes de error para los datos principales.

  const [userData, setUserData] = useState<ClientData | null>(null);
  // Guarda los datos del usuario (nickname).

  const [showModal, setShowModal] = useState<boolean>(false);
  // Controla si el modal está visible.

  const [selectedProduct, setSelectedProduct] = useState<HistorialStock | null>(null);
  // Producto seleccionado para ver detalles o historial.

  const [viewMode, setViewMode] = useState<"details" | "history">("details");
  // Modo del modal: "details" para detalles, "history" para historial de ventas.

  const [currentPage, setCurrentPage] = useState<number>(1);
  // Página actual de la tabla paginada.

  const [itemsPerPage, setItemsPerPage] = useState<number>(ITEMS_PER_PAGE_OPTIONS[1]);
  // Cantidad de ítems por página (por defecto 25).

  const [searchTerm, setSearchTerm] = useState<string>("");
  // Término de búsqueda para filtrar la tabla.

  const [connections, setConnections] = useState<Connection[]>([]);
  // Lista de conexiones disponibles a MercadoLibre.

  const [selectedConnection, setSelectedConnection] = useState<string>("");
  // Conexión seleccionada actualmente.

  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  // Indica si el historial de ventas está cargando.

  const [historyError, setHistoryError] = useState<string | null>(null);
  // Mensaje de error para el historial de ventas.

  const [sortConfig, setSortConfig] = useState<{ key: keyof HistorialStock; direction: 'asc' | 'desc' } | null>(null);
  // Configuración de ordenamiento de la tabla (columna y dirección).

  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({});
  // Filtro por rango de fechas.

  const [quantityFilter, setQuantityFilter] = useState<{ min?: number; max?: number }>({});
  // Filtro por rango de cantidades.

  const [salesHistoryCache, setSalesHistoryCache] = useState<Map<string, SalesHistory[]>>(new Map());
  // Caché para almacenar historiales de ventas ya cargados.

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const response = await axiosInstance.get(`${API_BASE_URL}/mercadolibre/credentials`);
        // Solicita la lista de conexiones a la API.
        console.log("Conexiones obtenidas:", response.data.data);
        setConnections(response.data.data);
        // Guarda las conexiones en el estado.
        if (response.data.data.length > 0) {
          setSelectedConnection(response.data.data[0].client_id);
          // Selecciona la primera conexión por defecto.
        } else {
          setError("No se encontraron conexiones disponibles.");
        }
      } catch (error) {
        console.error('Error al obtener las conexiones:', error);
        setError('Error al cargar las conexiones');
      }
    };
    fetchConnections();
  }, []);
  // Se ejecuta una vez al montar el componente para cargar las conexiones.

  const processStockData = useCallback((data: any[]): HistorialStock[] => {
    const salesMap: { [key: string]: HistorialStock } = {};
    data.forEach((item) => {
      const productId = item.id || "";
      if (!salesMap[productId]) {
        salesMap[productId] = {
          id: productId,
          title: item.title || "Sin título",
          available_quantity: item.available_quantity || 0,
          stock_reload_date: item.stock_reload_date || new Date().toISOString(),
          purchase_sale_date: item.purchase_sale_date || new Date().toISOString(),
          history: [],
          sku: item.sku || "Sin SKU",
          details: item.details || [],
        };
      }
    });
    return Object.values(salesMap);
    // Transforma los datos crudos de la API en el formato HistorialStock.
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedConnection) {
      console.log("No hay conexión seleccionada, no se puede cargar los datos.");
      setError("Por favor, selecciona una conexión.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [stockResponse, userResponse] = await Promise.all([
        axiosInstance.get(`${API_BASE_URL}/mercadolibre/stock/${selectedConnection}`),
        axiosInstance.get(`${API_BASE_URL}/mercadolibre/credentials/${selectedConnection}`),
      ]);
      // Hace dos solicitudes paralelas: una para el stock y otra para los datos del usuario.

      console.log("Datos de stock:", stockResponse.data.data);
      const stockData = Array.isArray(stockResponse.data.data)
        ? processStockData(stockResponse.data.data)
        : [];
      setHistorialStock(stockData);
      setUserData({ nickname: userResponse.data.data.nickname || "Sin nickname" });
    } catch (err: any) {
      const errorMessage = err.response
        ? `Error ${err.response.status}: ${err.response.data.message || "Datos no disponibles"}`
        : "Sin conexión a la API";
      console.error("Error al cargar datos:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedConnection, processStockData]);
  // Carga los datos de stock y usuario cuando cambia la conexión seleccionada.

  const fetchSalesHistory = useCallback(async (clientId: string, productId: string) => {
    const cacheKey = `${clientId}-${productId}`;
    if (salesHistoryCache.has(cacheKey)) {
      return salesHistoryCache.get(cacheKey)!;
      // Usa la caché si ya se cargó el historial.
    }

    setHistoryLoading(true);
    setHistoryError(null);
    try {
      if (!clientId || !productId) {
        throw new Error("Falta el clientId o productId para la solicitud.");
      }
      const baseUrl = `${API_BASE_URL}/mercadolibre/stock-sales-history/${clientId}/${productId}`;
      let allSales: any[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;
      // Paginación para obtener todas las ventas.

      while (hasMore) {
        const url = `${baseUrl}?page=${page}&limit=${limit}`;
        console.log(`Haciendo solicitud a: ${url}`);
        const response = await axiosInstance.get(url);
        console.log(`Respuesta del endpoint (página ${page}):`, JSON.stringify(response.data, null, 2));

        if (!response.data || typeof response.data !== "object") {
          throw new Error("La respuesta del endpoint no tiene el formato esperado.");
        }

        const salesData = response.data.sales || [];
        const totalSalesCount = response.data.sales_count || 0;

        if (!Array.isArray(salesData)) {
          throw new Error("El campo 'sales' no es un arreglo.");
        }

        allSales = [...allSales, ...salesData];

        if (allSales.length >= totalSalesCount || salesData.length < limit) {
          hasMore = false;
        } else {
          page++;
        }
      }

      const salesHistory: SalesHistory[] = allSales
        .map((sale: any) => {
          if (!sale.sale_date || sale.quantity === undefined) {
            console.warn("Entrada de historial inválida:", sale);
            return null;
          }
          console.log("Fecha de venta en historial:", sale.sale_date, "Cantidad vendida:", sale.quantity);
          return {
            date: sale.sale_date,
            quantity: sale.quantity,
          };
        })
        .filter((entry: SalesHistory | null) => entry !== null) as SalesHistory[];

      console.log("Historial completo mapeado:", salesHistory);
      setSalesHistoryCache(prev => new Map(prev).set(cacheKey, salesHistory));
      return salesHistory;
    } catch (err: any) {
      const errorMessage = err.response
        ? `Error ${err.response.status}: ${err.response.data?.message || "Datos no disponibles"}`
        : err.message || "Sin conexión a la API";
      console.error("Error al obtener el historial:", err);
      setHistoryError(errorMessage);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [salesHistoryCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  // Carga los datos principales cada vez que fetchData cambia (por ejemplo, al cambiar la conexión).

  const handleViewDetails = useCallback(
    async (product: HistorialStock, mode: "details" | "history") => {
      console.log("Producto seleccionado:", product);
      console.log("Conexión seleccionada:", selectedConnection);
      if (!product.id) {
        console.error("El producto no tiene un ID válido:", product);
        setHistoryError("El producto seleccionado no tiene un ID válido.");
        return;
      }

      setSelectedProduct(product);
      setViewMode(mode);
      setShowModal(true);

      if (mode === "history" && (!product.history || product.history.length === 0)) {
        if (!selectedConnection) {
          console.log("No hay conexión seleccionada para cargar el historial.");
          setHistoryError("Por favor, selecciona una conexión.");
          return;
        }
        const salesHistory = await fetchSalesHistory(selectedConnection, product.id);
        console.log("Actualizando selectedProduct con historial:", salesHistory);
        setSelectedProduct((prev) =>
          prev ? { ...prev, history: salesHistory } : null
        );
      }
    },
    [selectedConnection, fetchSalesHistory]
  );
  // Muestra el modal con detalles o historial y carga el historial si es necesario.

  const handleSort = (key: keyof HistorialStock) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  // Ordena la tabla por una columna específica en orden ascendente o descendente.

  const filteredAndSortedData = useMemo(() => {
    let result = [...historialStock];

    // Filtro de búsqueda
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.title || "").toLowerCase().includes(lowerSearchTerm) ||
          (item.sku || "").toLowerCase().includes(lowerSearchTerm) ||
          (item.id || "").toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Filtro por fechas
    if (dateFilter.start || dateFilter.end) {
      result = result.filter(item => {
        const date = new Date(item.purchase_sale_date || "");
        const start = dateFilter.start ? new Date(dateFilter.start) : null;
        const end = dateFilter.end ? new Date(dateFilter.end) : null;
        return (!start || date >= start) && (!end || date <= end);
      });
    }

    // Filtro por cantidad
    if (quantityFilter.min || quantityFilter.max) {
      result = result.filter(item => {
        const qty = item.available_quantity || 0;
        return (!quantityFilter.min || qty >= quantityFilter.min) && 
               (!quantityFilter.max || qty <= quantityFilter.max);
      });
    }



    return result;
  }, [historialStock, searchTerm, sortConfig, dateFilter, quantityFilter]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedData.slice(startIndex, endIndex);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPage(Number(e.target.value));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleConnectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedConnection(e.target.value);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleDateFilterChange = (field: 'start' | 'end', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleQuantityFilterChange = (field: 'min' | 'max', value: string) => {
    setQuantityFilter(prev => ({ ...prev, [field]: value ? Number(value) : undefined }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateFilter({ start: undefined, end: undefined });
    setQuantityFilter({ min: undefined, max: undefined });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error al formatear la fecha:", dateString, error);
      return "Fecha inválida";
    }
  };

  return (
    <Container fluid className={styles.customContainer}>
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className={styles.customCard}>
            <div className={styles.customHeader}>
              <h1>Historial de Stock</h1>
              {userData && <h4 className="mt-2">{userData.nickname}</h4>}
            </div>
            <Card.Body className="p-4">
              <Row className="mb-4">
                <Col>
                  <Form.Select
                    value={selectedConnection}
                    onChange={handleConnectionChange}
                    className={styles.customSelect}
                  >
                    <option value="">Selecciona una conexión</option>
                    {connections.map((connection) => (
                      <option key={connection.client_id} value={connection.client_id}>
                        {connection.nickname} ({connection.client_id})
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              <Row className="mb-4 align-items-center">
                <Col xs={12} md={6}>
                  <Link to="/sync/home" className={`btn btn-primary ${styles.customBtn}`}>
                    Volver a Inicio
                  </Link>
                </Col>
                <Col xs={12} md={6} className="d-flex gap-3 justify-content-end">
                  <Form className="d-flex" style={{ maxWidth: "300px" }}>
                    <Form.Control
                      type="text"
                      placeholder="Buscar por Nombre, SKU o Número de Impresión..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className={styles.customInput}
                    />
                    <Button variant="outline-primary" className="ms-2" disabled>
                      <FontAwesomeIcon icon={faSearch} />
                    </Button>
                  </Form>
                  <Button
                    variant="outline-primary"
                    onClick={fetchData}
                    disabled={loading}
                    className={styles.customBtn}
                  >
                    <FontAwesomeIcon icon={faSync} spin={loading} />{" "}
                    {loading ? "Cargando..." : "Refrescar"}
                  </Button>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={3} className="mb-3">
                  <Form.Group className={styles.floatingLabel}>
                    <Form.Control
                      type="date"
                      id="dateStart"
                      value={dateFilter.start || ''}
                      onChange={(e) => handleDateFilterChange('start', e.target.value)}
                      className={styles.customInputFilter}
                    />
                    <Form.Label htmlFor="dateStart">Fecha Inicio</Form.Label>
                  </Form.Group>
                </Col>
                <Col md={3} className="mb-3">
                  <Form.Group className={styles.floatingLabel}>
                    <Form.Control
                      type="date"
                      id="dateEnd"
                      value={dateFilter.end || ''}
                      onChange={(e) => handleDateFilterChange('end', e.target.value)}
                      className={styles.customInputFilter}
                    />
                    <Form.Label htmlFor="dateEnd">Fecha Fin</Form.Label>
                  </Form.Group>
                </Col>
                <Col md={3} className="mb-3">
                  <Form.Group className={styles.floatingLabel}>
                    <Form.Control
                      type="number"
                      id="quantityMin"
                      value={quantityFilter.min || ''}
                      onChange={(e) => handleQuantityFilterChange('min', e.target.value)}
                      className={styles.customInputFilter}
                    />
                    <Form.Label htmlFor="quantityMin">Cant. Mínima</Form.Label>
                  </Form.Group>
                </Col>
                <Col md={3} className="mb-3">
                  <Form.Group className={styles.floatingLabel}>
                    <Form.Control
                      type="number"
                      id="quantityMax"
                      value={quantityFilter.max || ''}
                      onChange={(e) => handleQuantityFilterChange('max', e.target.value)}
                      className={styles.customInputFilter}
                    />
                    <Form.Label htmlFor="quantityMax">Cant. Máxima</Form.Label>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3 align-items-center">
                <Col md={3} className="mb-3">
                  <Form.Select
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className={styles.customSelect}
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option} por página
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3} className="mb-3">
                  <Button
                    variant="outline-danger"
                    onClick={handleClearFilters}
                    className={styles.customBtn}
                  >
                    <FontAwesomeIcon icon={faTimes} /> Limpiar Filtros
                  </Button>
                </Col>
              </Row>

              {loading ? (
                <LoadingDinamico variant="container" />
              ) : error ? (
                <Alert variant="danger" className="text-center">
                  {error}
                  <Button variant="link" onClick={fetchData} className="ms-2">
                    Reintentar
                  </Button>
                </Alert>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table striped hover className={styles.customTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                            Numero de impresión <FontAwesomeIcon icon={faSort} />
                          </th>
                          <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }}>
                            Sku <FontAwesomeIcon icon={faSort} />
                          </th>
                          <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                            Nombre del Producto <FontAwesomeIcon icon={faSort} />
                          </th>
                          <th onClick={() => handleSort('available_quantity')} style={{ cursor: 'pointer' }}>
                            Cantidad Disponible <FontAwesomeIcon icon={faSort} />
                          </th>
                          <th onClick={() => handleSort('purchase_sale_date')} style={{ cursor: 'pointer' }}>
                            Fecha de Última Venta <FontAwesomeIcon icon={faSort} />
                          </th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.length > 0 ? (
                          paginatedData.map((item, index) => (
                            <tr key={item.id}>
                              <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                              <td>{item.id}</td>
                              <td>{item.sku}</td>
                              <td className="fw-bold">{item.title}</td>
                              <td className="text-success">{item.available_quantity}</td>
                              <td>{formatDate(item.purchase_sale_date)}</td>
                              <td>
                                <div className="d-flex gap-2 justify-content-center">
                                  <Button
                                    variant="info"
                                    onClick={() => handleViewDetails(item, "details")}
                                    className={styles.customBtn}
                                  >
                                    <FontAwesomeIcon icon={faInfoCircle} /> Detalles
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    onClick={() => handleViewDetails(item, "history")}
                                    className={styles.customBtn}
                                  >
                                    <FontAwesomeIcon icon={faHistory} /> Historial
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={7} className="text-center py-3">{searchTerm ? "No se encontraron resultados" : "No hay datos disponibles"}</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <Row className={`mt-4 align-items-center ${styles.paginationContainer}`}>
                      <Col xs="auto">
                        <Button
                          variant="primary"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className={styles.paginationBtn}
                        >
                          <FontAwesomeIcon icon={faChevronLeft} /> Anterior
                        </Button>
                      </Col>
                      <Col xs="auto">
                        <Form.Select
                          value={currentPage}
                          onChange={handlePageChange}
                          className={styles.pageSelect}
                        >
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <option key={page} value={page}>
                              Página {page}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col xs="auto">
                        <span className={styles.pageInfo}>
                          de {totalPages}
                        </span>
                      </Col>
                      <Col xs="auto">
                        <Button
                          variant="primary"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className={styles.paginationBtn}
                        >
                          Siguiente <FontAwesomeIcon icon={faChevronRight} />
                        </Button>
                      </Col>
                    </Row>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <br /><br />
      <footer className={styles.customFooter}>
        Multi Stock Sync © {new Date().getFullYear()}
      </footer>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            {viewMode === "details" ? "Detalles del Producto" : "Historial de Ventas"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && viewMode === "details" && (
            <div className="p-3">
              <p><strong>ID del Producto:</strong> {selectedProduct.id}</p>
              <p><strong>Nombre del Producto:</strong> {selectedProduct.title}</p>
              <p><strong>Cantidad Disponible:</strong> {selectedProduct.available_quantity}</p>
              <p>
                <strong>Fecha de Última Venta:</strong>{" "}
                {formatDate(selectedProduct.purchase_sale_date)}
              </p>
              {selectedProduct.details && selectedProduct.details.length > 0 ? (
                <div>
                  <h5 className="fw-bold text-primary mt-3">Detalles Adicionales:</h5>
                  <ul className="list-group">
                    {selectedProduct.details.map((detail, index) => (
                      <li key={index} className="list-group-item">
                        <strong>{detail.name}:</strong> {detail.value_name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted mt-3">No hay detalles adicionales disponibles.</p>
              )}
            </div>
          )}
          {selectedProduct && viewMode === "history" && (
            <div className="p-3">
              <h5 className="fw-bold text-primary">{selectedProduct.title}</h5>
              {historyLoading ? (
                <LoadingDinamico variant="container" />
              ) : historyError ? (
                <Alert variant="danger" className="text-center">
                  {historyError}
                  <Button
                    variant="link"
                    onClick={() => handleViewDetails(selectedProduct, "history")}
                    className="ms-2"
                  >
                    Reintentar
                  </Button>
                </Alert>
              ) : selectedProduct.history.length > 0 ? (
                <ul className="list-group">
                  {selectedProduct.history.map((entry, index) => (
                    <li key={index} className="list-group-item">
                      {formatDate(entry.date)} - Cantidad Vendida: <strong>{entry.quantity}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-3">
                  {selectedProduct.purchase_sale_date && new Date(selectedProduct.purchase_sale_date).getTime() > 0
                    ? `No hay ventas registradas en el historial, pero la última venta reportada fue el ${formatDate(selectedProduct.purchase_sale_date)}.`
                    : "No hay historial de ventas disponible para este producto."}
                </p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
  
};

export default HistorialStock;