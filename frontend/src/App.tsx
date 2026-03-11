import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StockTable from './components/StockTable';
import TradingViewChart from './components/TradingViewChart';
import StockStats from './components/StockStats';
import { fetchStocksByCategory, type Stock } from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Momentum');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [starredSymbols, setStarredSymbols] = useState<string[]>(() => {
    const saved = localStorage.getItem('starredStocks');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('starredStocks', JSON.stringify(starredSymbols));
  }, [starredSymbols]);

  useEffect(() => {
    const getStocks = async () => {
      setLoading(true);
      if (activeTab === 'Watchlist') {
        const data = await fetchStocksByCategory('Momentum');
        setStocks(data.stocks.filter((s: Stock) => starredSymbols.includes(s.symbol)));
      } else {
        const data = await fetchStocksByCategory(activeTab);
        setStocks(data.stocks || []);
      }
      setLoading(false);
    };
    getStocks();
  }, [activeTab, starredSymbols]);

  const handleStarClick = (symbol: string) => {
    setStarredSymbols(prev =>
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol);
  };

  return (
    <div className="main-layout">
      <Sidebar 
        activeCategory={activeTab} 
        setActiveCategory={setActiveTab} 
        starredCount={starredSymbols.length} 
      />
      
      <div className="content-area">
        {selectedStock ? (
          <div className="detail-container">
            <button
              onClick={() => setSelectedStock(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#c5a059',
                fontSize: '1rem',
                cursor: 'pointer',
                marginBottom: 20
              }}
            >
              ← Back to Dashboard
            </button>
            <h2 style={{ color: '#fff', marginBottom: 10 }}>{selectedStock} Performance</h2>
            <TradingViewChart symbol={selectedStock} />
            <StockStats symbol={selectedStock} />
          </div>
        ) : (
          <>
            <div style={{ padding: '40px 40px 20px', borderBottom: '1px solid #222' }}>
              <h2 style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>
                {activeTab} <span style={{ color: 'var(--primary-gold)' }}>Screener</span>
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#a0a0a0', marginTop: 10 }}>
                Live insights and professional trading metrics for {activeTab}
              </p>
            </div>
            
            <div style={{ padding: '20px 40px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 100, color: 'var(--text-dim)' }}>
                  <div className="loader"></div>
                  Searching Excel records...
                </div>
              ) : (
                <StockTable
                  stocks={stocks}
                  starredSymbols={starredSymbols}
                  onStockClick={handleStockClick}
                  onStarClick={handleStarClick}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
