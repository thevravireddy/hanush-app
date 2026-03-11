import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';
import axios from 'axios';

interface TradingViewChartProps {
    symbol: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [interval, setInterval] = React.useState('1d');

    const timeframes = [
        { label: '5M', value: '5m' },
        { label: '15M', value: '15m' },
        { label: '1H', value: '1h' },
        { label: '1D', value: '1d' },
        { label: '1W', value: '1wk' },
        { label: '1MO', value: '1mo' },
    ];

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0d0d0d' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1a1a1a' },
                horzLines: { color: '#1a1a1a' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 600, // Increased height
            localization: {
                timeFormatter: (time: number) => {
                    if (typeof time !== 'number') return '';
                    const date = new Date(time * 1000);
                    const hours = date.getUTCHours().toString().padStart(2, '0');
                    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                    if (interval === '1d' || interval === '1wk' || interval === '1mo') {
                        return date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1).toString().padStart(2, '0') + '-' + date.getUTCDate().toString().padStart(2, '0');
                    }
                    return `${hours}:${minutes}`;
                },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#4caf50',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#4caf50',
            wickDownColor: '#ef5350',
        });

        // Indicators
        const ema20Series = chart.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'EMA 20' });
        const sma50Series = chart.addLineSeries({ color: '#FF9800', lineWidth: 1, title: 'SMA 50' });
        const rsiSeries = chart.addLineSeries({ color: '#9C27B0', lineWidth: 1, title: 'RSI (14)', priceScaleId: 'rsi' });

        chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0.05 },
        });

        chartRef.current = chart;

        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/stocks/history/${symbol}?interval=${interval}`);
                const history = response.data;
                if (history && history.length > 0) {
                    candlestickSeries.setData(history.map((d: any) => ({
                        time: d.time,
                        open: d.open,
                        high: d.high,
                        low: d.low,
                        close: d.close,
                    })));

                    ema20Series.setData(history.filter((d: any) => d.ema_20).map((d: any) => ({ time: d.time, value: d.ema_20 })));
                    sma50Series.setData(history.filter((d: any) => d.sma_50).map((d: any) => ({ time: d.time, value: d.sma_50 })));
                    rsiSeries.setData(history.filter((d: any) => d.rsi).map((d: any) => ({ time: d.time, value: d.rsi })));

                    chart.timeScale().fitContent();
                }
            } catch (error) {
                console.error('Error fetching data for Lightweight Charts:', error);
            }
        };

        fetchData();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [symbol, interval]);

    return (
        <div className="chart-wrapper" style={{ width: '100%' }}>
            <div className="timeframe-selector" style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                {timeframes.map((tf) => (
                    <button
                        key={tf.value}
                        onClick={() => setInterval(tf.value)}
                        style={{
                            padding: '6px 12px',
                            background: interval === tf.value ? '#c5a059' : '#333',
                            border: 'none',
                            borderRadius: '4px',
                            color: interval === tf.value ? '#000' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                        }}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>
            <div
                ref={chartContainerRef}
                style={{ width: '100%', height: '500px', borderRadius: '8px', overflow: 'hidden' }}
            />
        </div>
    );
};

export default TradingViewChart;
