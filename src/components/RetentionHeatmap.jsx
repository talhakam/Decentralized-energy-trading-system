import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const RetentionHeatmap = () => {
  const data = [
    {"cohort":"Jan","month0":100,"month1":88.8,"month2":79.5,"month3":74.2,"month4":68.2,"month5":65.4,"month6":59.4,"totalUsers":2854},
    {"cohort":"Feb","month0":100,"month1":89.2,"month2":80.6,"month3":72.1,"month4":65.3,"month5":62.3,"month6":55.7,"totalUsers":2960}
  ];

  const getColor = (value) => {
    const intensity = Math.floor((value / 100) * 255);
    return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
  };

  const monthKeys = Object.keys(data[0])
    .filter(key => key.startsWith('month'))
    .sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Energy Trading Retention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border text-left">Cohort</th>
                <th className="p-2 border text-left">Total Traders</th>
                {monthKeys.map((month) => (
                  <th key={month} className="p-2 border text-center">
                    Month {month.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.cohort}>
                  <td className="p-2 border font-medium">{row.cohort}</td>
                  <td className="p-2 border text-right">{row.totalUsers.toLocaleString()}</td>
                  {monthKeys.map((month) => (
                    <td
                      key={month}
                      className="p-2 border text-center"
                      style={{
                        backgroundColor: getColor(row[month]),
                        color: row[month] > 50 ? 'white' : 'black'
                      }}
                    >
                      {row[month].toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RetentionHeatmap;