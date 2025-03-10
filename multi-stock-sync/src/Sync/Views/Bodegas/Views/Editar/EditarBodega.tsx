import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../../../../axiosConfig';
import ToastComponent from '../../../../Components/ToastComponent/ToastComponent';
import { LoadingDinamico } from '../../../../../components/LoadingDinamico/LoadingDinamico';

interface Company {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

const EditarBodega: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        assigned_company_id: ''
    });
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'danger'>('success');

    useEffect(() => {
        axiosInstance.get(`${process.env.VITE_API_URL}/companies`)
            .then(response => {
                setCompanies(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching companies:', error);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        axiosInstance.get(`${process.env.VITE_API_URL}/warehouses/${id}`)
            .then(response => {
                setFormData({
                    name: response.data.name || '',
                    location: response.data.location || '',
                    assigned_company_id: response.data.assigned_company_id || ''
                });
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching warehouse:', error);
                setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => {
                setToastMessage(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        axiosInstance.patch(`${process.env.VITE_API_URL}/warehouses/${id}`, formData)
            .then(response => {
                console.log('Success:', response.data);
                setToastMessage('Bodega actualizada con éxito.');
                setToastType('success');
                setLoading(false);
            })
            .catch(error => {
                console.error('Error:', error.response.data);
                setToastMessage('Datos inválidos.');
                setToastType('danger');
                setLoading(false);
            });
    };

    const closeToast = () => {
        setToastMessage(null);
    };

    if (loading) {
        return <LoadingDinamico variant='container' />;
    }

    return (
        <div className="container mt-5">
            <h1>Editar Bodega</h1>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label">Nombre:</label>
                    <input type="text" className="form-control" id="name" name="name" value={formData.name} onChange={handleChange}/>
                </div>
                <div className="mb-3">
                    <label htmlFor="location" className="form-label">Ubicación de la bodega (opcional):</label>
                    <input type="text" className="form-control" id="location" name="location" value={formData.location} onChange={handleChange} />
                </div>
                <div className="mb-3">
                    <label htmlFor="assigned_company_id" className="form-label">Compañía Asignada:</label>
                    <select className="form-select" id="assigned_company_id" name="assigned_company_id" value={formData.assigned_company_id} onChange={handleChange}>
                        <option value="">Seleccione una compañía</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="btn btn-primary mx-2">Guardar cambios</button>
                <Link to="../home" className="btn btn-danger">Volver</Link>
            </form>
            {toastMessage && (
                <ToastComponent 
                    message={toastMessage} 
                    type={toastType} 
                    onClose={closeToast} 
                />
            )}
        </div>
    );
};

export default EditarBodega;