import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface StockInfo {
    symbol: string;
    name?: string;
    sector?: string;
    market_cap?: number;
    pe_ratio?: number;
    high_52w?: number;
    low_52w?: number;
    summary?: string;
    price?: number;
    change_pct?: number;
}

const StockStats: React.FC<{ symbol: string }> = ({ symbol }) => {
    const [info, setInfo] = useState<StockInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    useEffect(() => {
        const fetchInfo = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE_URL}/stocks/info/${symbol}`);
                setInfo(response.data);
            } catch (error) {
                console.error("Error fetching stock info:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [symbol]);

    if (loading) return <div className="loading-stats">Loading fundamentals...</div>;
    if (!info) return null;

    const formatCurrency = (val?: number) => {
        if (!val) return 'N/A';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const formatNumber = (val?: number) => {
        if (val === undefined || val === null) return 'N/A';
        return val.toFixed(2);
    };

    return (
        <div className="stock-stats-card">
            <div className="stats-header">
                <h3>{info.name} ({info.symbol})</h3>
                <p className="sector-tag">{info.sector}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-item">
                    <span className="stat-label">Market Cap</span>
                    <span className="stat-value">{formatCurrency(info.market_cap)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">P/E Ratio</span>
                    <span className="stat-value">{formatNumber(info.pe_ratio)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">52W High</span>
                    <span className="stat-value">{formatCurrency(info.high_52w)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">52W Low</span>
                    <span className="stat-value">{formatCurrency(info.low_52w)}</span>
                </div>
            </div>

            {info.summary && (
                <div className="stats-summary">
                    <h4>About Company</h4>
                    <p>{info.summary.length > 300 ? info.summary.substring(0, 300) + '...' : info.summary}</p>
                </div>
            )}
        </div>
    );
};

export default StockStats;
