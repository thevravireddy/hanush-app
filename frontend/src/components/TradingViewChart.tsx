import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from 'lightweight-charts';
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

        // Determine if interval is intraday
        const isIntraday = interval === '5m' || interval === '15m' || interval === '1h';

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
            height: 600,
            timeScale: {
                // ✅ FIX: Show time for intraday, hide for daily+
                timeVisible: isIntraday,
                secondsVisible: false,
                borderColor: '#2B2B43',
                visible: true,
                minBarSpacing: 0.5,
                // ✅ FIX: TradingView-style tick formatting
                tickMarkFormatter: (time: number | string) => {
                    // Handle both timestamp (number) and date string formats
                    let timestamp: number;
                    
                    if (typeof time === 'string') {
                        // Parse date string like "2024-03-11"
                        timestamp = new Date(time).getTime() / 1000;
                    } else {
                        timestamp = time;
                    }
                    
                    const date = new Date(timestamp * 1000);
                    
                    if (interval === '5m' || interval === '15m' || interval === '1h') {
                        // Intraday: Show time, only show date at day boundary
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        
                        // Show date only at midnight (00:00)
                        if (hours === '00' && minutes === '00') {
                            const day = date.getDate().toString().padStart(2, '0');
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const month = monthNames[date.getMonth()];
                            return `${month} ${day}`;
                        }
                        return `${hours}:${minutes}`;
                        
                    } else if (interval === '1d') {
                        // Daily: Show date, month name at month start
                        const day = date.getDate();
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const month = monthNames[date.getMonth()];
                        const year = date.getFullYear();
                        
                        // Show month name on first day of month
                        if (day === 1) {
                            return `${month} ${year}`;
                        }
                        return day.toString();
                        
                    } else if (interval === '1wk') {
                        // Weekly: Show month and day
                        const day = date.getDate();
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const month = monthNames[date.getMonth()];
                        return `${month} ${day}`;
                        
                    } else {
                        // Monthly: Show month and year
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const month = monthNames[date.getMonth()];
                        const year = date.getFullYear();
                        return `${month} ${year}`;
                    }
                },
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
                visible: true,
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    color: '#758696',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#c5a059',
                },
                horzLine: {
                    color: '#758696',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#c5a059',
                },
            },
            localization: {
                // ✅ FIX: Crosshair time formatter
                timeFormatter: (time: number | string) => {
                    let timestamp: number;
                    
                    if (typeof time === 'string') {
                        timestamp = new Date(time).getTime() / 1000;
                    } else {
                        timestamp = time;
                    }
                    
                    const date = new Date(timestamp * 1000);
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    
                    if (interval === '5m' || interval === '15m' || interval === '1h') {
                        return `${year}-${month}-${day} ${hours}:${minutes}`;
                    }
                    return `${year}-${month}-${day}`;
                },
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#00ff88',
            downColor: '#ff4d4d',
            borderVisible: false,
            wickUpColor: '#00ff88',
            wickDownColor: '#ff4d4d',
        });

        chartRef.current = chart;

        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/stocks/history/${symbol}?interval=${interval}`);
                const history = response.data;
                
                if (history && history.length > 0) {
                    // ✅ FIX: Handle both timestamp formats (number or string)
                    const processedData = history.map((d: any) => {
                        let time: UTCTimestamp;
                        
                        // Check if time is a string (date format) or number (timestamp)
                        if (typeof d.time === 'string') {
                            // Parse string date like "2024-03-11" and convert to timestamp
                            const dateObj = new Date(d.time);
                            time = Math.floor(dateObj.getTime() / 1000) as UTCTimestamp;
                        } else if (typeof d.time === 'number') {
                            // Already a timestamp
                            time = d.time as UTCTimestamp;
                        } else {
                            console.error('Invalid time format:', d.time);
                            return null;
                        }
                        
                        return {
                            time,
                            open: parseFloat(d.open),
                            high: parseFloat(d.high),
                            low: parseFloat(d.low),
                            close: parseFloat(d.close),
                        };
                    }).filter(Boolean); // Remove any null entries

                    // ✅ FIX: Sort by time
                    const sortedData = processedData.sort((a: any, b: any) => a.time - b.time);

                    console.log('Chart data sample:', sortedData.slice(0, 3)); // Debug log

                    candlestickSeries.setData(sortedData);
                    chart.timeScale().fitContent();
                    
                    // Force resize to ensure labels render
                    setTimeout(() => {
                        if (chartContainerRef.current) {
                            chart.applyOptions({ 
                                width: chartContainerRef.current.clientWidth 
                            });
                        }
                    }, 100);
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
            <div 
                className="timeframe-selector" 
                style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    marginBottom: '15px', 
                    flexWrap: 'wrap' 
                }}
            >
                {timeframes.map((tf) => (
                    <button
                        key={tf.value}
                        onClick={() => setInterval(tf.value)}
                        style={{
                            padding: '8px 16px',
                            background: interval === tf.value ? '#c5a059' : '#333',
                            border: interval === tf.value ? '2px solid #c5a059' : '1px solid #555',
                            borderRadius: '4px',
                            color: interval === tf.value ? '#000' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: interval === tf.value ? 'bold' : 'normal',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            if (interval !== tf.value) {
                                e.currentTarget.style.background = '#444';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (interval !== tf.value) {
                                e.currentTarget.style.background = '#333';
                            }
                        }}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>
            <div
                ref={chartContainerRef}
                style={{ 
                    width: '100%', 
                    height: '600px', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    display: 'block',
                    position: 'relative'
                }}
            />
        </div>
    );
};

export default TradingViewChart;
