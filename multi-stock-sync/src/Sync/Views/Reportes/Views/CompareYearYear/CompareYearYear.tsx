import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './CompareYearYear.module.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from 'react-bootstrap';
import axiosInstance from '../../../../../axiosConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver'; /* esta funcionando 👌 */
import { LoadingDinamico } from '../../../../../components/LoadingDinamico/LoadingDinamico';


const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

const CompareYearYear: React.FC = () => {
    const { client_id } = useParams<{ client_id: string }>();
    const [year1, setYear1] = useState('');
    const [year2, setYear2] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [nickname, setNickname] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchNickname = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get(`${import.meta.env.VITE_API_URL}/mercadolibre/credentials/${client_id}`);
                console.log('Nickname response:', response.data);
                setNickname(response.data.data.nickname);
            } catch (error) {
                console.error('Error fetching nickname:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNickname();
    }, [client_id]);

    const handleDropdownChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        setter(e.target.value);
    };

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
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    /* Pdf------------------------------------------------------ */
    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFillColor(0, 121, 191);
        doc.rect(0, 0, 210, 30, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text("Reporte de Comparación de Ventas Anuales", 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Cliente: ${nickname}`, 14, 40);

        if (result) {
            const { year1, year2, difference, percentage_change } = result.data;

            doc.text(`Comparación entre ${year1.year} y ${year2.year}`, 14, 50);

            doc.setFontSize(14);
            doc.text(`${year1.year}`, 105, 70, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Total Ventas: ${formatCurrency(year1.total_sales)}`, 105, 80, { align: 'center' });

            autoTable(doc, {
                head: [["Producto", "Cantidad", "Precio"]],
                body: year1.sold_products.map((product: any) => [
                    product.title,
                    product.quantity,
                    formatCurrency(product.price),
                ]),
                startY: 90,
                theme: 'grid',
                margin: { bottom: 10 }
            });

            doc.setFontSize(14);
            doc.text(`${year1.year}`, 105, (doc as any).lastAutoTable.finalY + 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Total Ventas: ${formatCurrency(year2.total_sales)}`, 105, (doc as any).lastAutoTable.finalY + 30, { align: 'center' });

            autoTable(doc, {
                head: [["Producto", "Cantidad", "Precio"]],
                body: year2.sold_products.map((product: any) => [
                    product.title,
                    product.quantity,
                    formatCurrency(product.price),
                ]),
                startY: (doc as any).lastAutoTable.finalY + 40,
                theme: 'grid',
                margin: { bottom: 10 }
            });
            doc.text(`Diferencia: ${formatCurrency(difference)}`, 14, (doc as any).lastAutoTable.finalY + 30);
            doc.setTextColor(percentage_change > 0 ? 'green' : 'red');
            doc.text(`Cambio Porcentual: ${percentage_change}%`, 14, (doc as any).lastAutoTable.finalY + 40);
        }

        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("----------Multi Stock Sync----------", 105, pageHeight - 10, { align: "center" });

        const pdfData = doc.output("datauristring");
        setPdfDataUrl(pdfData);
        setShowModal(true);
    };
    /* fin del pdf---------------------------------------------------------------------------*/


    /* excel */
    const exportToExcel = () => {
        if (!result) return;

        const workbook = XLSX.utils.book_new();

        const createSheet = (yearData: any) => {
            const data = yearData.sold_products.map((product: any) => ({
                Producto: product.title,
                Cantidad: product.quantity,
                Precio: formatCurrency(product.price),
            }));

            data.unshift({ Producto: `Total Ventas: ${formatCurrency(yearData.total_sales)}`, Cantidad: '', Precio: '' });

            return XLSX.utils.json_to_sheet(data, { skipHeader: false });
        };

        const sheet1 = createSheet(result.data.year1);
        const sheet2 = createSheet(result.data.year2);

        XLSX.utils.book_append_sheet(workbook, sheet1, `Ventas ${year1}`);
        XLSX.utils.book_append_sheet(workbook, sheet2, `Ventas ${year2}`);

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        saveAs(excelBlob, `Comparacion_Ventas_${year1}_${year2}.xlsx`);
    };

    /* fin del excel */
    return (
        <>
            {loading && <LoadingDinamico variant="container" />}

            <div className={styles.container} style={{ display: loading ? 'none' : 'block', maxWidth: '90%', margin: '0 auto' }}>
                {!loading && (
                    <>
                        <h1>Comparar Ventas entre Años</h1>
                        <p>USUARIO: {nickname}</p>

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

                            <div className={styles.buttonContainer}>
                                <button type="submit" className="btn btn-primary">Comparar</button>
                            </div>
                        </form>
                        <div style={{ maxHeight: '600px', overflowY: 'auto', width: '100%' }}>
                            {/* generasion de la tabla ----------------------- */}
                            {result && (
                                <div style={{ maxHeight: '600px', overflowY: 'auto', width: '100%' }}>
                                    <h1>Resultado de la Comparación</h1>

                                    <div className={styles.tableContainer}>
                                        <h3>{year1}</h3>
                                        <p>Total Ventas: <strong>{formatCurrency(result.data.year1.total_sales)}</strong></p>
                                        
                                        <table className={`table table-striped ${styles.table}`}>
                                            <thead>
                                                <tr>
                                                    <th className="table_header">Producto</th>
                                                    <th className="table_header">Cantidad</th>
                                                    <th className="table_header">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.data.year1.sold_products.map((product: any) => (
                                                    <tr key={product.order_id}>
                                                        <td>{product.title}</td>
                                                        <td>{product.quantity}</td>
                                                        <td>{formatCurrency(product.price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={styles.tableContainer}>
                                        <h3>{year2}</h3>
                                        <p>Total Ventas: <strong>{formatCurrency(result.data.year2.total_sales)}</strong></p>
                                        
                                        <table className={`table table-striped ${styles.table}`}>
                                            <thead>
                                                <tr>
                                                    <th className="table_header">Producto</th>
                                                    <th className="table_header">Cantidad</th>
                                                    <th className="table_header">Precio</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.data.year2.sold_products.map((product: any) => (
                                                    <tr key={product.order_id}>
                                                        <td>{product.title}</td>
                                                        <td>{product.quantity}</td>
                                                        <td>{formatCurrency(product.price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <p>Diferencia: <strong>{formatCurrency(result.data.difference)}</strong></p>
                                    <p style={{ color: result.data.percentage_change > 0 ? 'green' : 'red' }}>
                                        Cambio Porcentual: <strong>{result.data.percentage_change}%</strong>
                                    </p>

                                    <button onClick={generatePDF} className="btn btn-secondary" style={{ marginRight: '20px' }}>Generar PDF</button>

                                    <button onClick={exportToExcel} className="btn btn-success">Descargar Excel</button>

                                </div>


                            )}
                        </div>


                        {/* fin de la generacion de la tabla -------------------------------------------------------------------------- */}
                    </>
                )}
            </div>
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Reporte de Comparación de Ventas Anuales</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {pdfDataUrl && <iframe src={pdfDataUrl} width="100%" height="500px" />}
                </Modal.Body>
                <Modal.Footer>
                    <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cerrar</button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default CompareYearYear;