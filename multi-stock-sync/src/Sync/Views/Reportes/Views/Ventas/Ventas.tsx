import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Form, Row, Col } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useParams } from "react-router-dom";
import axiosInstance from "../../../../../axiosConfig";
import "bootstrap/dist/css/bootstrap.min.css";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { LoadingDinamico } from "../../../../../components/LoadingDinamico/LoadingDinamico";
import ToastComponent from "../../../../Components/ToastComponent/ToastComponent";
import styles from "./Ventas.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface Venta {
  order_id: number;
  order_date: string;
  title: string;
  quantity: number;
  price: number;
}

const DetallesDeVentas: React.FC = () => {
  const { client_id } = useParams<{ client_id: string }>();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [yearSeleccionado, setYearSeleccionado] = useState<number>(currentYear);
  const [monthSeleccionado, setMonthSeleccionado] = useState<number>(currentMonth);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filtroActivo, setFiltroActivo] = useState<'mes' | 'año' | 'comparacion' | null>(null);
  const [userData, setUserData] = useState<{ nickname: string; profile_image: string } | null>(null);
  const totalIngresos = ventas.reduce((total, venta) => total + venta.price * venta.quantity, 0);
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const [year1, setYear1] = useState('');
  const [year2, setYear2] = useState('');
  const [result, setResult] = useState<any>(null);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };
  const fetchVentas = useCallback(async () => {
    if (!client_id) return;
    setLoading(true);
    try {
      const params = {
        year: yearSeleccionado,
        month: monthSeleccionado.toString().padStart(2, "0"),
      };
      const response = await axiosInstance.get(
        `${import.meta.env.VITE_API_URL}/mercadolibre/sales-by-month/${client_id}`,
        { params }
      );

      const ventasData =
        response.data.data[`${yearSeleccionado}-${params.month}`]?.orders.flatMap((order: any) =>
          order.sold_products.map((product: any) => ({
            order_id: product.order_id,
            order_date: product.order_date,
            title: product.title,
            quantity: product.quantity,
            price: product.price,
          }))
        ) || [];

      setVentas(ventasData);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setVentas([]);
      setToastMessage("Error al obtener los datos");
    } finally {
      setLoading(false);
    }
  }, [client_id, yearSeleccionado, monthSeleccionado]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const chartData = {
    labels: ventas.map((venta) => venta.title), // Usar la fecha de la venta como etiquetas
    datasets: [
      {
        label: 'Ventas por Orden',
        data: ventas.map((venta) => venta.price), // Usar el precio como dato del gráfico
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };


  const fetchUserData = useCallback(async () => {
    if (!client_id) return;
    try {
      const response = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/mercadolibre/credentials/${client_id}`);

      setUserData({
        nickname: response.data.data.nickname,
        profile_image: response.data.data.profile_image,
      });

    } catch (error) {
      console.error("Error al obtener los datos del usuario:", error);
    }
  }, [client_id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/mercadolibre/compare-annual-sales-data/${client_id}`, {
        params: { year1, year2 }
      });
      console.log('Comparison response:', response.data);
      setResult(response.data);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDropdownChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
    };

  return (
    <div className="container mt-4">
      {toastMessage && (
        <ToastComponent message={toastMessage} type="danger" onClose={() => setToastMessage(null)} />
      )}
      <h1 className="text-center mb-4">Detalles de Ventas</h1>

      {userData && (
        <div style={{ textAlign: "center" }}>
          <h3>Usuario: {userData.nickname}</h3>
          <img
            src={userData.profile_image}
            alt="Profile"
            style={{ width: "100px", height: "100px", borderRadius: "50%" }}
          />
        </div>
      )}
      <br />

      <Form className="mb-4">
        <Row className="d-flex justify-content-center">



          {/* Filtro por mes */}
          <Col xs="auto" className="mb-3">
            <Button
              variant={filtroActivo === 'mes' ? 'primary' : 'outline-primary'}
              onClick={() => setFiltroActivo(filtroActivo === 'mes' ? null : 'mes')}
              disabled={filtroActivo === 'año' || filtroActivo === 'comparacion'}
              className="w-100"
            >
              Filtrar por Mes
            </Button>
            {filtroActivo === 'mes' && (
              <div className="mt-2">
                <Form className="mb-4">
                  <Row className="d-flex justify-content-center">
                    <Col xs="auto">
                      <Form.Group controlId="formYear">
                        <Form.Label>Año</Form.Label>
                        <Form.Control
                          as="select"
                          value={yearSeleccionado}
                          onChange={(e) => setYearSeleccionado(Number(e.target.value))}
                          className="w-auto"
                        >
                          {[2023, 2024, 2025, 2026].map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </Form.Control>
                      </Form.Group>
                    </Col>
                    <Col xs="auto">
                      <Form.Group controlId="formMonth">
                        <Form.Label>Mes</Form.Label>
                        <Form.Control
                          as="select"
                          value={monthSeleccionado}
                          onChange={(e) => setMonthSeleccionado(Number(e.target.value))}
                          className="w-auto"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                              {month.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </Form.Control>
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </div>
            )}
          </Col>







          {/* Filtro por año */}
          <Col xs="auto" className="mb-3">
            <Button
              variant={filtroActivo === "año" ? "primary" : "outline-primary"}
              onClick={() => setFiltroActivo(filtroActivo === "año" ? null : "año")}
              disabled={filtroActivo === "mes" || filtroActivo === "comparacion"}
              className="w-100"
            >
              Filtrar por Año
            </Button>
            {filtroActivo === "año" && (
              <div className="mt-2">
                <Form.Group controlId="formYear" className="d-flex flex-column align-items-center">
                  <Form.Label >Año</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-auto"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </div>
            )}
          </Col>


          {/* Filtro de comparación */}
          <Col xs="auto" className="mb-3">
            <Button
              variant={filtroActivo === 'comparacion' ? 'primary' : 'outline-primary'}
              onClick={() => setFiltroActivo(filtroActivo === 'comparacion' ? null : 'comparacion')}
              disabled={filtroActivo === 'mes' || filtroActivo === 'año'}
              className="w-100"
            >
              Comparar Año a Año
            </Button>
            {filtroActivo === 'comparacion' && (
              <div className="mt-2">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Año 1</label>
                    <select className="form-control" value={year1} onChange={handleDropdownChange(setYear1)} required>
                      <option value="">Seleccione un año</option>
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Año 2</label>
                    <select className="form-control" value={year2} onChange={handleDropdownChange(setYear2)} required>
                      <option value="">Seleccione un año</option>
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>
            )}
          </Col>
        </Row>
      </Form>



















      <Row className="d-flex justify-content-center mt-3">
        <Col xs="auto">
          <Button variant="success" onClick={fetchVentas}>
            Consultar Datos
          </Button>
        </Col>
      </Row>
      <br />


      {/* Mostrar gráfico encima de la tabla */}
      {ventas.length > 0 && !loading && (
        <div className="mb-4">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Ventas por Orden',
                  font: {
                    size: 18,
                    weight: 'bold',
                  },
                },
                legend: {
                  position: 'top',
                },
              },
            }}
          />
        </div>
      )}

      {/* Mostrar tabla con los datos de ventas */}
      {loading ? (
        <LoadingDinamico variant="container" />
      ) : (
        <Table striped bordered hover responsive className="mt-4">
          <thead className="table-dark">
            <tr>
              <th>ID Orden</th>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length > 0 ? (
              ventas.map((venta, index) => (
                <tr key={index}>
                  <td>{venta.order_id}</td>
                  <td>{venta.order_date}</td>
                  <td>{venta.title}</td>
                  <td>{venta.quantity}</td>
                  <td>${venta.price.toLocaleString('es-CL')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center">
                  No hay datos disponibles
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}


      <h4 className="text-center mt-3">Total de ingresos: ${totalIngresos.toLocaleString('es-CL')}</h4>

    </div>
  );

};

export default DetallesDeVentas;
