// Chart.js initialization for fire statistics
document.addEventListener("DOMContentLoaded", function () {
  // Check if we have the fire stats chart
  const fireStatsEl = document.getElementById("fireStatsChart");
  if (!fireStatsEl) return;

  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const areaSeries = [
    12.5, 8.3, 15.2, 22.1, 18.7, 25.4, 31.2, 28.9, 19.6, 14.3, 9.8, 7.2,
  ];
  const countSeries = [45, 32, 58, 72, 65, 89, 95, 87, 68, 52, 38, 29];

  // If Chart.js is present, use it
  if (window.Chart) {
    const ctx = fireStatsEl.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Average Fire Area (ha)",
            data: areaSeries,
            backgroundColor: "#667EEA",
            borderColor: "#667EEA",
            borderWidth: 3,
            fill: true,
          },
          {
            label: "Number of Fires",
            data: countSeries,
            backgroundColor: "#4A5568",
            borderColor: "#4A5568",
            borderWidth: 3,
            yAxisID: "y1",
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: "Fire Statistics by Month" } },
      },
    });
    return;
  }

  // Fallback: draw a simple dual-series chart using Canvas API
  const ctx = fireStatsEl.getContext("2d");
  const width = fireStatsEl.width;
  const height = fireStatsEl.height;
  const margin = { top: 26, right: 40, bottom: 40, left: 40 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  const n = labels.length;

  const maxArea = Math.max(...areaSeries);
  const maxCount = Math.max(...countSeries);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(margin.left, margin.top);

  // axes
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, chartH);
  ctx.lineTo(chartW, chartH);
  ctx.stroke();

  // scales
  const xStep = chartW / (n - 1);

  function yFromArea(v) {
    return chartH - (v / maxArea) * chartH;
  }
  function yFromCount(v) {
    return chartH - (v / maxCount) * chartH;
  }

  // area line
  ctx.strokeStyle = "#667EEA";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = i * xStep;
    const y = yFromArea(areaSeries[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // count line (right axis semantics ignored in fallback; for display only)
  ctx.strokeStyle = "#4A5568";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = i * xStep;
    const y = yFromCount(countSeries[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // x labels
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "11px Arial";
  for (let i = 0; i < n; i++) {
    const x = i * xStep;
    ctx.fillText(labels[i], x, chartH + 6);
  }

  // title
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillText("Fire Statistics by Month", chartW / 2, -20);

  ctx.restore();
});
