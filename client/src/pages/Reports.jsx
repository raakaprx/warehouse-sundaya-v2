import React, { useState } from 'react'; // ← TAMBAH INI
import axios from 'axios';

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [loadingType, setLoadingType] = useState('');

    const handleDownload = async (reportType) => {
        setLoading(true);
        setLoadingType(reportType);
        
        try {
            const token = localStorage.getItem('token');

            const response = await axios({
                method: 'POST',
                url: 'http://localhost:5000/api/reports/export',
                data: {
                    report: reportType
                },
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${reportType}_report_${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Download gagal:', error);
            alert(`Gagal download PDF!`);
        } finally {
            setLoading(false);
            setLoadingType('');
        }
    };

    const downloadRecentMovements = async () => {
        setLoading(true);
        setLoadingType('recent');
        try {
            const token = localStorage.getItem('token');
            
            console.log('📥 Starting download for recent movements (POST)');
            
            const response = await axios({
                method: 'POST', // Mengubah ke POST
                url: 'http://localhost:5000/api/reports/recent-movements-pdf',
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/pdf'
                },
                timeout: 30000
            });

            console.log('📦 Response received:', response.status, response.headers['content-type']);
            
            if (!response.data || response.data.size === 0) {
                throw new Error('Response kosong dari server');
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            console.log('📄 Blob created:', blob.size, 'bytes');
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `recent_movements_${Date.now()}.pdf`);
            document.body.appendChild(link);
            
            console.log('✅ Triggering download');
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error('❌ Download error:', error);
            alert('Gagal download laporan! ' + (error.message || ''));
        } finally {
            setLoading(false);
            setLoadingType('');
        }
    };

    const downloadRequestStatusReport = async (statusType) => {
        setLoading(true);
        setLoadingType(`status_${statusType}`);
        try {
            const token = localStorage.getItem('token');
            
            console.log(`📥 Starting download for statusType: ${statusType} (POST)`);
            
            const response = await axios({
                method: 'POST', // Mengubah ke POST
                url: 'http://localhost:5000/api/reports/request-status-pdf',
                data: { statusType: statusType }, // Kirim data di body
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'application/pdf'
                },
                timeout: 30000
            });

            console.log('📦 Response received:', response.status, response.headers['content-type']);
            
            if (!response.data || response.data.size === 0) {
                throw new Error('Response kosong dari server');
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            console.log('📄 Blob created:', blob.size, 'bytes');
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = statusType === 'RECEIVED' 
                ? `Barang_Diterima_${Date.now()}.pdf` 
                : `Barang_Belum_Diterima_${Date.now()}.pdf`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            
            console.log('✅ Triggering download:', fileName);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error('❌ Download error:', error);
            alert('Gagal download laporan! ' + (error.message || ''));
        } finally {
            setLoading(false);
            setLoadingType('');
        }
    };

    const isLoading = (type) => loading && loadingType === type;

    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ marginBottom: '8px' }}>📊 Reports</h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>
                Download laporan dalam format PDF
            </p>

            {/* Stock Opname */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0' }}>📦 Stock Opname Report</h3>
                <p style={{ color: '#888', margin: '0 0 12px 0' }}>
                    Laporan stok semua material per site
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => handleDownload('stock')}
                        disabled={loading}
                        style={btnStyle('#e74c3c')}
                    >
                        {isLoading('stock') ? '⏳ Loading...' : '📥 Download PDF'}
                    </button>
                </div>
            </div>

            {/* Stock Mutation */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0' }}>🔄 Stock Mutation Report</h3>
                <p style={{ color: '#888', margin: '0 0 12px 0' }}>
                    Laporan mutasi stok masuk dan keluar
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => handleDownload('mutation')}
                        disabled={loading}
                        style={btnStyle('#e74c3c')}
                    >
                        {isLoading('mutation') ? '⏳ Loading...' : '📥 Download PDF'}
                    </button>
                </div>
            </div>

            {/* Material Request */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0' }}>📋 Material Request Report</h3>
                <p style={{ color: '#888', margin: '0 0 12px 0' }}>
                    Laporan semua permintaan material
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => handleDownload('request')}
                        disabled={loading}
                        style={btnStyle('#e74c3c')}
                    >
                        {isLoading('request') ? '⏳ Loading...' : '📥 Download PDF'}
                    </button>
                </div>
            </div>

            {/* Recent Movements */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0' }}>🚚 Recent Movements Report</h3>
                <p style={{ color: '#888', margin: '0 0 12px 0' }}>
                    Laporan pergerakan material terbaru
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={downloadRecentMovements}
                        disabled={loading}
                        style={btnStyle('#8e44ad')}
                    >
                        {isLoading('recent') ? '⏳ Loading...' : '📥 PDF'}
                    </button>
                </div>
            </div>

            {/* Barang Diterima */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0' }}>✅ Laporan Barang Diterima</h3>
                <p style={{ color: '#888', margin: '0 0 12px 0' }}>
                    Riwayat pengiriman material yang sudah diterima
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => downloadRequestStatusReport('RECEIVED')}
                        disabled={loading}
                        style={btnStyle('#27ae60')}
                    >
                        {isLoading('status_RECEIVED') ? '⏳ Loading...' : '📥 Download PDF'}
                    </button>
                </div>
            </div>

            {/* Barang Belum Diterima */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 8px 0' }}>⏳ Laporan Barang Belum Diterima</h3>
                <p style={{ color: '#888', margin: '0 0 12px 0' }}>
                    Riwayat pengiriman material yang masih pending
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => downloadRequestStatusReport('PENDING')}
                        disabled={loading}
                        style={btnStyle('#e67e22')}
                    >
                        {isLoading('status_PENDING') ? '⏳ Loading...' : '📥 Download PDF'}
                    </button>
                </div>
            </div>

            {/* Loading Toast */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 9999
                }}>
                    ⏳ Sedang mengunduh...
                </div>
            )}
        </div>
    );
};

const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

const btnStyle = (color) => ({
    padding: '8px 20px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    opacity: 1
});

export default Reports;