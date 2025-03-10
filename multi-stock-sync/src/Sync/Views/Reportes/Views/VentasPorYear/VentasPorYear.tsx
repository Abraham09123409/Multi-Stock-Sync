import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../../../../axiosConfig';
import { Modal, Button, Form } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './VentasPorYear.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * VentasPorYear component displays annual sales data for a specific client.
 * 
 * @component
 * @returns {JSX.Element} The rendered component.
 * 
 * @remarks
 * This component fetches sales data and user information based on the client ID from the URL parameters.
 * It allows the user to select a year and view the sales data in a bar chart.
 * The user can also generate PDF and Excel reports of the sales data.
 * 
 * @example
 * ```tsx
 * <VentasPorYear />
 * ```
 * 
 * @hook
 * - `useParams` to get the client ID from the URL.
 * - `useState` to manage state variables.
 * - `useEffect` to fetch data when the component mounts or when dependencies change.
 * 
 * @function fetchSalesData
 * Fetches sales data for the selected year and client ID.
 * 
 * @function fetchUserName
 * Fetches the username for the given client ID.
 * 
 * @function generatePDF
 * Generates a PDF report of the sales data using jsPDF and autoTable.
 * 
 * @function generateExcel
 * Generates an Excel report of the sales data using XLSX.
 * 
 * @function getRandomColor
 * Generates a random color for the chart bars.
 * 
 * @constant {Array<string>} years
 * An array of years for the user to select from.
 * 
 * @constant {number} totalSales
 * The total sales amount for the selected year.
 * 
 * @constant {object} totalSalesData
 * The data object for the bar chart.
 * 
 * @constant {object} options
 * The options object for the bar chart.
 */
const VentasPorYear: React.FC = () => {
    const { client_id } = useParams<{ client_id: string }>();
    const [salesData, setSalesData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState<boolean>(false);
    const [pdfData, setPdfData] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('2025');
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const fetchSalesData = async () => {
            setLoading(true);
            try {
                const apiUrl = `${import.meta.env.VITE_API_URL}/mercadolibre/annual-sales/${client_id}?year=${selectedYear}`;
                const response = await axiosInstance.get(apiUrl);
                const data = response.data.data;
                const formattedData = Object.keys(data).map(month => ({
                    month,
                    total_sales: data[month].total_amount,
                    sold_products: data[month].orders.flatMap((order: { sold_products: any; }) => order.sold_products)
                }));
                setSalesData(formattedData);
            } catch (error) {
                console.error('Error fetching sales data:', error);
                setSalesData([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchUserName = async () => {
            try {
                const apiUrl = `${import.meta.env.VITE_API_URL}/mercadolibre/credentials/${client_id}`;
                const response = await axiosInstance.get(apiUrl);
                setUserName(response.data.data.nickname);
            } catch (error) {
                console.error('Error al obtener el nombre del usuario:', error);
            }
        };

        fetchSalesData();
        fetchUserName();
    }, [client_id, selectedYear]);

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height;
        doc.text('Ventas Por Año', 10, 10);
        doc.text(`Usuario: ${userName}`, 10, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Mes', 'Ventas Totales', 'Productos Vendidos']],
            body: salesData.map((month) => [
                month.month,
                `$ ${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(month.total_sales)} CLP`,
                month.sold_products.map((product: any) => `${product.title}: ${product.quantity}`).join('\n')
            ]),
            foot: [['', 'Total Ventas:', `$ ${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(totalSales)} CLP`]],
            didDrawCell: (data) => {
                if (data.section === 'foot' && data.column.index === 2) {
                    doc.setTextColor(150, 150, 150); // Set text color to gray
                }
            },
            didDrawPage: (_data) => {
                doc.setTextColor(150, 150, 150);
                doc.text("----------Multi Stock Sync----------", 105, pageHeight - 10, { align: 'center' });
            }
        });
    
        const pdfOutput = doc.output('datauristring');
        setPdfData(pdfOutput);
        setShowPDFModal(true);
    };  

    const generateExcel = () => {
        const worksheetData = [
            ['Mes', 'ID', 'Nombre del Producto', 'Cantidad Vendida', 'Valor del Producto'],
            ...salesData.flatMap((month) => {
                const monthData = month.sold_products.map((product: any, index: number) => [
                    index === 0 ? month.month : '', // Print "Mes" only for the first entry of each month
                    product.order_id.toString(), // Convert ID to string
                    product.title,
                    product.quantity,
                    `$ ${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(product.price)} CLP`
                ]);
                return monthData;
            })
        ];
    
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'VentasPorYear');
    
        // Apply some basic styling
        const wscols = [
            { wch: 15 }, // "Mes" column width
            { wch: 30 }, // "ID" column width
            { wch: 30 }, // "Nombre del Producto" column width
            { wch: 20 }, // "Cantidad Vendida" column width
            { wch: 20 }  // "Valor del Producto" column width
        ];
        worksheet['!cols'] = wscols;
    
        const cellRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        for (let row = 1; row <= cellRange.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: 2 });
            if (!worksheet[cellAddress]) continue;
            worksheet[cellAddress].s = {
                alignment: { wrapText: true }
            };
        }
    
        const fileName = `VentasPor${selectedYear}_${userName}.xlsx`;
    
        XLSX.writeFile(workbook, fileName);
    };

    const years = Array.from({ length: 4 }, (_, i) => (2025 - i).toString());

    const getRandomColor = () => {
        const letters = '456789AB'; // Use darker colors
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 8)];
        }
        return color;
    };

    const totalSales = salesData.reduce((acc, month) => acc + month.total_sales, 0);

    const colors = salesData.map(() => getRandomColor());

    const totalSalesData = {
        labels: salesData.map(month => month.month),
        datasets: [
            {
                label: 'Ventas Totales',
                data: salesData.map(month => month.total_sales),
                backgroundColor: colors,
                borderColor: colors, // Use the same color for border
                borderWidth: 1
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const
            },
            title: {
                display: true,
                text: `Ventas Totales Por Año (${selectedYear}): $${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(totalSales)} CLP`,
                font: {
                    size: 18 // Add font size here
                }
            },
            datalabels: {
                color: 'white',
                font: {
                    weight: 'bold' as 'bold'
                },
                formatter: (value: number) => {
                    return `$ ${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(value)} CLP`;
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return `$ ${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(context.raw)} CLP`;
                    }
                }
            },
            afterDraw: (chart: { ctx: any; chartArea: { width: number; top: number; }; }) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.fillText(`Total Ventas: $${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(totalSales)} CLP`, chart.chartArea.width / 2, chart.chartArea.top - 10);
                ctx.restore();
            }
        }
    };

    return (
        <div>
            <h1>Ventas Por Año</h1>
            <p>Usuario: {userName}</p>
            <Form.Group controlId="formYear" className="d-flex justify-content-center">
                <Form.Label className="mr-2">Seleccione un Año</Form.Label>
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
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className={`${styles.VentasPorYear} d-flex flex-column align-items-center`}>
                    <div className="w-75 rounded p-3 shadow" style={{ backgroundColor: '#f8f9fa', borderRadius: '15px' }}>
                        <div className="chart-container" style={{ position: 'relative', height: '66vh', width: '100%' }}>
                            <Bar data={totalSalesData} options={options} />
                        </div>
                        <Button variant="primary" onClick={() => setShowDetails(!showDetails)} className="mt-3">
                            {showDetails ? 'Ocultar Detalles' : 'Mostrar Detalles'}
                        </Button>
                        {showDetails && (
                            <div>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '5%' }}>Mes</th>
                                            <th style={{ width: '9%' }}>Ventas Totales</th>
                                            <th>Productos Vendidos</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesData.map((month) => (
                                            <tr key={month.month}>
                                                <td>{month.month}</td>
                                                <td>{`$ ${new Intl.NumberFormat('es-CL', { style: 'decimal', minimumFractionDigits: 0 }).format(month.total_sales)} CLP`}</td>
                                                <td>{month.sold_products.map((product: any) => `${product.title}: ${product.quantity}`).join('\n')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="d-flex justify-content-center mt-3">
                            <Button variant="primary" onClick={generatePDF} className="mr-2 mx-2">Guardar Reporte PDF</Button>
                            <Button variant="secondary" onClick={generateExcel}>Guardar Reporte Excel</Button>
                        </div>
                    </div>
                </div>
            )}
            <Modal show={showPDFModal} onHide={() => setShowPDFModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Vista Previa del PDF</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {pdfData && (
                        <iframe
                            src={pdfData}
                            style={{ width: '100%', height: '500px' }}
                            title="PDF Preview"
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPDFModal(false)}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={() => {
                        const link = document.createElement('a');
                        link.href = pdfData!;
                        link.download = `VentasPor${selectedYear}.pdf`;
                        link.click();
                    }}>
                        Guardar PDF
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default VentasPorYear;