document.addEventListener("DOMContentLoaded", function () {
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
            fill: false,
          },
          {
            label: "Number of Fires",
            data: countSeries,
            backgroundColor: "#4A5568",
            borderColor: "#4A5568",
            borderWidth: 3,
            yAxisID: "y1",
            fill: false,
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
});
