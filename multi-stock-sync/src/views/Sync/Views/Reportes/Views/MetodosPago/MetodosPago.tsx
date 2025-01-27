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
import { LoadingDinamico } from '../../../../../../components/LoadingDinamico/LoadingDinamico';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const MetodosPago: React.FC = () => {
  const { client_id } = useParams<{ client_id: string }>();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ nickname: string; creation_date: string } | null>(null);

  const [paymentData, setPaymentData] = useState({
    account_money: 0,
    debit_card: 0,
    credit_card: 0,
  });

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/mercadolibre/top-payment-methods/${client_id}`);
        const result = await response.json();

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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/mercadolibre/credentials/${client_id}`);
        const result = await response.json();

        if (result.status === 'success') {
          setUserData({
            nickname: result.data.nickname,
            creation_date: result.data.creation_date,
          });
        } else {
          console.error('Error en la respuesta de la API:', result.message);
        }
      } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
      }
    };

    fetchPaymentData();
    fetchUserData();
  }, [client_id]);

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
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Reporte de Métodos de Pago", 105, 20, { align: "center" });
    doc.setDrawColor(0, 0, 0);
    doc.line(20, 25, 190, 25);
    doc.setFontSize(12);

    if (userData) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black font
      doc.text(`Usuario: ${userData.nickname}`, 20, 55);
      doc.text(`Fecha de Creación: ${userData.creation_date}`, 20, 65);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(34, 139, 34); // Green for total
    doc.text(`Total de Transacciones: ${total}`, 20, 35);

    autoTable(doc, {
      startY: 70,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 12,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
      head: [["Método de Pago", "Cantidad", "Porcentaje"]],
      body: [
        ["Dinero en Cuenta", paymentData.account_money, `${calculatePercentage(paymentData.account_money)}%`],
        ["Tarjeta de Débito", paymentData.debit_card, `${calculatePercentage(paymentData.debit_card)}%`],
        ["Tarjeta de Crédito", paymentData.credit_card, `${calculatePercentage(paymentData.credit_card)}%`],
      ],
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150); // Grey for footer
    doc.text("----------Multi Stock Sync----------", 105, pageHeight - 10, {
      align: "center",
    });

    const pdfData = doc.output("datauristring");
    setPdfDataUrl(pdfData);
    setShowModal(true);
  };

  return (
    <>
      {loading ? (
        <LoadingDinamico variant="container" />
      ) : (
        <div className={`container ${styles.container}`}>
            <h1 className={`text-center mb-4`}>Métodos de Pago más utilizados</h1>
            <h5 className="text-center text-muted mb-5">Distribución de los métodos de pago utilizados por el cliente</h5>
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
                  <button
                    type="button"
                    className="btn btn-success mt-3"
                    onClick={generatePDF}
                  >
                    Exportar a PDF
                  </button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
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
