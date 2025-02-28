import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Card, ProgressBar, Modal } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useParams } from 'react-router-dom';
import styles from './MetodosPago.module.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { LoadingDinamico } from '../../../../../components/LoadingDinamico/LoadingDinamico';
import axiosInstance from '../../../../../axiosConfig';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const MetodosPago: React.FC = () => {
  const { client_id } = useParams<{ client_id: string }>();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ nickname: string; creation_date: string; request_date: string } | null>(null);
  const [year, setYear] = useState<string>('alloftimes');
  const [selectedYear, setSelectedYear] = useState<string>('alloftimes');
  const [paymentData, setPaymentData] = useState({
    account_money: 0,
    debit_card: 0,
    credit_card: 0,
  });
  const [chartVisible, setChartVisible] = useState(false);

  const fetchPaymentData = async (selectedYear: string) => {
    try {
      const response = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/mercadolibre/top-payment-methods/${client_id}?year=${selectedYear}`);
      const result = response.data;

      if (result.status === 'success') {
        setPaymentData(result.data);
      } else {
        console.error('Error en la respuesta de la API:', result.message);
      }
    } catch (error) {
      console.error('Error al obtener los datos de la API:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/mercadolibre/credentials/${client_id}`);
      const result = response.data;

      if (result.status === 'success') {
        setUserData({
          nickname: result.data.nickname,
          creation_date: result.data.creation_date || 'N/A',
          request_date: result.data.request_date || 'N/A',
        });
      } else {
        console.error('Error en la respuesta de la API:', result.message);
      }
    } catch (error) {
      console.error('Error al obtener los datos del usuario:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [client_id]);

  const handleGenerateChart = () => {
    setLoading(true);
    setSelectedYear(year);
    setChartVisible(true);
    fetchPaymentData(year);
  };

  const total =
    paymentData.account_money + paymentData.debit_card + paymentData.credit_card;

  const calculatePercentage = (value: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  };

  const chartData = {
    labels: ['Dinero en Cuenta', 'Tarjeta de Débito', 'Tarjeta de Crédito'],
    datasets: [
      {
        label: 'Métodos de Pago',
        data: [
          paymentData.account_money,
          paymentData.debit_card,
          paymentData.credit_card,
        ],
        backgroundColor: ['#0d6efd', '#ffc107', '#198754'],
        borderColor: ['#0b5ed7', '#e0a800', '#157347'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      datalabels: {
        formatter: (value: number, context: any) => {
          const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${percentage}%`;
        },
        color: '#fff',
        font: {
          weight: 'bold' as 'bold',
        },
      },
    },
  };

  const generatePDF = (): void => {
    if (!userData || !userData.nickname) {
      console.error("No se pudo obtener el nickname del usuario.");
      return;
    }

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString();
    const displayYear = selectedYear === 'alloftimes' ? 'El origen de los tiempos' : selectedYear;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Reporte de Métodos de Pago", 105, 20, { align: "center" });
    doc.setDrawColor(0, 0, 0);
    doc.line(20, 25, 190, 25);
    doc.setFontSize(12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text(`Usuario: ${userData.nickname}`, 20, 55);
    doc.text(`Fecha de Creación del Reporte: ${currentDate}`, 20, 75);
    doc.text(`Año Seleccionado: ${displayYear}`, 20, 85);

    autoTable(doc, {
      startY: 90,
      head: [["Método de Pago", "Cantidad", "Porcentaje"]],
      body: [
        ["Dinero en Cuenta", paymentData.account_money, `${calculatePercentage(paymentData.account_money)}%`],
        ["Tarjeta de Débito", paymentData.debit_card, `${calculatePercentage(paymentData.debit_card)}%`],
        ["Tarjeta de Crédito", paymentData.credit_card, `${calculatePercentage(paymentData.credit_card)}%`],
      ],
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34);
    doc.text(`Total de Transacciones: ${total}`, 20, (doc as any).autoTable.previous.finalY + 10);

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("----------Multi Stock Sync----------", 105, pageHeight - 10, { align: "center" });


    const pdfData = doc.output("datauristring");
    setPdfDataUrl(pdfData);
    setShowModal(true);


    const pdfFilename = `MetodosPago_${client_id}_${userData.nickname}.pdf`;
    doc.save(pdfFilename);
  };


  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => (currentYear - i).toString());

  const generateExcel = () => {
    if (!userData || !userData.nickname) {
      console.error("No se pudo obtener el nickname del usuario.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet([
      { Metodo: 'Dinero en Cuenta', Cantidad: paymentData.account_money, Porcentaje: `${calculatePercentage(paymentData.account_money)}%` },
      { Metodo: 'Tarjeta de Débito', Cantidad: paymentData.debit_card, Porcentaje: `${calculatePercentage(paymentData.debit_card)}%` },
      { Metodo: 'Tarjeta de Crédito', Cantidad: paymentData.credit_card, Porcentaje: `${calculatePercentage(paymentData.credit_card)}%` },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MetodosPago');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const excelFilename = `MetodosPago_${client_id}_${userData.nickname}.xlsx`;
    saveAs(data, excelFilename);
  };

  return (
    <>
      <div className={`container ${styles.container}`}>
        <h1 className={`text-center mb-4`}>Métodos de Pago más utilizados</h1>
        <h5 className="text-center text-muted mb-5">Distribución de los métodos de pago utilizados por el cliente</h5>
        <div className="mb-4">
          <label htmlFor="yearSelect" className="form-label">Seleccione el Año:</label>
          <select id="yearSelect" className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="alloftimes">Desde el origen de los tiempos</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className="btn btn-primary mt-3" onClick={handleGenerateChart}>Generar Gráfico</button>
        </div>
        {loading ? (
          <LoadingDinamico variant="container" />
        ) : (
          chartVisible && (
            <Card className="shadow-lg">
              <Card.Body>
                <div className="row">
                  <div className="col-md-6 d-flex justify-content-center">
                    <div className={styles.chartContainer}>
                      <Pie data={chartData} options={chartOptions} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h4 className={`text-center mb-3 ${styles.h4}`}>Resumen</h4>
                    <ul className="list-group mb-4">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Dinero en Cuenta
                        <span className="badge bg-primary rounded-pill">
                          {calculatePercentage(paymentData.account_money)}% ({paymentData.account_money})
                        </span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Tarjeta de Débito
                        <span className="badge bg-warning rounded-pill">
                          {calculatePercentage(paymentData.debit_card)}% ({paymentData.debit_card})
                        </span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Tarjeta de Crédito
                        <span className="badge bg-success rounded-pill">
                          {calculatePercentage(paymentData.credit_card)}% ({paymentData.credit_card})
                        </span>
                      </li>
                    </ul>
                    <h4 className={`text-center mb-3 ${styles.h4}`}>Distribución</h4>
                    <ProgressBar className={styles.progressBar}>
                      <ProgressBar
                        now={parseFloat(calculatePercentage(paymentData.account_money))}
                        label={
                          parseFloat(calculatePercentage(paymentData.account_money)) > 5
                            ? `Dinero (${calculatePercentage(paymentData.account_money)}%)`
                            : ''
                        }
                        variant="primary"
                        key={1}
                      />
                      <ProgressBar
                        now={parseFloat(calculatePercentage(paymentData.debit_card))}
                        label={
                          parseFloat(calculatePercentage(paymentData.debit_card)) > 5
                            ? `Débito (${calculatePercentage(paymentData.debit_card)}%)`
                            : ''
                        }
                        variant="warning"
                        key={2}
                      />
                      <ProgressBar
                        now={parseFloat(calculatePercentage(paymentData.credit_card))}
                        label={
                          parseFloat(calculatePercentage(paymentData.credit_card)) > 5
                            ? `Crédito (${calculatePercentage(paymentData.credit_card)}%)`
                            : ''
                        }
                        variant="success"
                        key={3}
                      />
                    </ProgressBar>

                    <div className="botones-exportar mt-4 d-flex justify-content-center">
                      <button
                        type="button"
                        className="btn btn-primary mx-3"
                        onClick={generatePDF}
                      >
                        Exportar a PDF
                      </button>

                      <button className="btn btn-success mx-3" onClick={generateExcel}>
                        Exportar a Excel
                      </button>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )
        )}
      </div>
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reporte de Métodos de Pago</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pdfDataUrl && (
            <iframe
              src={pdfDataUrl}
              width="100%"
              height="500px"
              title="Reporte de Métodos de Pago"
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default MetodosPago;