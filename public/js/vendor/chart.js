// Chart.js initialization for fire statistics
document.addEventListener("DOMContentLoaded", function () {
  // Check if we have the fire stats chart
  const fireStatsEl = document.getElementById("fireStatsChart");
  if (fireStatsEl) {
    const ctx = fireStatsEl.getContext("2d");

    // Sample data - in a real app, this would come from the server
    const fireData = {
      labels: [
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
      ],
      datasets: [
        {
          label: "Average Fire Area (ha)",
          data: [
            12.5, 8.3, 15.2, 22.1, 18.7, 25.4, 31.2, 28.9, 19.6, 14.3, 9.8, 7.2,
          ],
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          borderColor: "rgba(102, 126, 234, 1)",
          borderWidth: 3,
          fill: true,
        },
        {
          label: "Number of Fires",
          data: [45, 32, 58, 72, 65, 89, 95, 87, 68, 52, 38, 29],
          backgroundColor: "rgba(74, 85, 104, 0.1)",
          borderColor: "rgba(74, 85, 104, 1)",
          borderWidth: 3,
          yAxisID: "y1",
          fill: true,
        },
      ],
    };

    new Chart(ctx, {
      type: "line",
      data: fireData,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Fire Statistics by Month",
            color: "#2d3748",
            font: {
              size: 16,
              weight: "600",
            },
          },
          legend: {
            labels: {
              color: "#4a5568",
              font: {
                size: 12,
                weight: "500",
              },
            },
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Average Area (hectares)",
              color: "#4a5568",
              font: {
                size: 12,
                weight: "500",
              },
            },
            ticks: {
              color: "#718096",
              font: {
                size: 11,
              },
            },
            grid: {
              color: "#e2e8f0",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Number of Fires",
              color: "#4a5568",
              font: {
                size: 12,
                weight: "500",
              },
            },
            ticks: {
              color: "#718096",
              font: {
                size: 11,
              },
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            title: {
              display: true,
              text: "Month",
              color: "#4a5568",
              font: {
                size: 12,
                weight: "500",
              },
            },
            ticks: {
              color: "#718096",
              font: {
                size: 11,
              },
            },
            grid: {
              color: "#e2e8f0",
            },
          },
        },
      },
    });
  }

  // Chart initialization complete
});
