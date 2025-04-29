import React from 'react';
import { ArrowUp, ArrowDown, Activity, AlertTriangle } from 'lucide-react';
import './Card.css';

const Card = ({ title, value, color = 'blue', isLoading = false, error = null, trend = null }) => {
  // Determine the text color class based on the provided color prop
  const colorClasses = {
    blue: 'card-value-blue',
    green: 'card-value-green',
    purple: 'card-value-purple',
    amber: 'card-value-amber',
    red: 'card-value-red'
  };

  const valueColorClass = colorClasses[color] || colorClasses.blue;
  const borderColorClass = `card-border-${color}`;

  return (
    <div className={`card ${borderColorClass}`}>
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-content">
        <div className="card-value-container">
          <div className={`card-value ${valueColorClass}`}>{value}</div>
          
          {trend && !isLoading && !error && (
            <div className={`card-trend ${trend.direction === 'up' ? 'trend-up' : trend.direction === 'down' ? 'trend-down' : 'trend-stable'}`}>
              {trend.direction === 'up' ? (
                <ArrowUp size={18} />
              ) : trend.direction === 'down' ? (
                <ArrowDown size={18} />
              ) : (
                <Activity size={18} />
              )}
              <span className="trend-percentage">{trend.percentage}%</span>
            </div>
          )}
        </div>
        
        {isLoading && (
          <div className="card-status card-loading">Updating...</div>
        )}
        
        {error && (
          <div className="card-status card-error">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;