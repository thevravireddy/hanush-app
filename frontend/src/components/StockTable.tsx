import React from 'react';

import { type Stock } from '../services/api';

interface StockTableProps {
    stocks: Stock[];
    starredSymbols: string[];
    onStockClick: (symbol: string) => void;
    onStarClick: (symbol: string) => void;
}

const StockTable: React.FC<StockTableProps> = ({ stocks, starredSymbols, onStockClick, onStarClick }) => {
    return (
        <div className="stock-table-container">
            <div className="table-header">
                <span>#</span>
                <span>SYMBOL</span>
                <span>SECTOR</span>
                <span>SCORE</span>
                <span>3M RETURN</span>
                <span>6M RETURN</span>
            </div>
            <div className="table-body">
                {stocks.map((stock) => (
                    <div key={stock.symbol} className="stock-row" onClick={() => onStockClick(stock.symbol)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button
                                className={`star-btn ${starredSymbols.includes(stock.symbol) ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStarClick(stock.symbol);
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                            <span className="rank">{stock.rank}</span>
                        </div>
                        <div className="symbol-col">
                            <span className="symbol-name">{stock.symbol}</span>
                            <span className="sector-name">{stock.sector}</span>
                        </div>
                        <div className="sector-bar-container">
                            <div className="sector-bar" style={{ width: `${stock.score}%` }}></div>
                        </div>
                        <span className="score">{stock.score}</span>
                        <span className={`return ${stock.return_3m >= 0 ? 'positive' : 'negative'}`}>
                            {stock.return_3m >= 0 ? '+' : ''}{stock.return_3m}%
                        </span>
                        <span className={`return ${stock.return_6m >= 0 ? 'positive' : 'negative'}`}>
                            {stock.return_6m >= 0 ? '+' : ''}{stock.return_6m}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StockTable;
