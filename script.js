const fileInput = document.getElementById("file");

function parseFile(file) {
  const fileReader = new FileReader();
  let records = [];
  let name;
  let time;
  let activity;
  const filePromise = new Promise(function (resolve, reject) {
    fileReader.onload = function () {
      const text = fileReader.result;
      const doc = new DOMParser().parseFromString(text, "text/xml");
      name = doc.querySelector("name").textContent;
      time = new Date(Date.parse(doc.querySelector("time").textContent));
      const intervals = doc.querySelectorAll("trkpt");
      for (let interval of intervals) {
        const instance = {
          lat: interval.getAttribute("lat"),
          lon: interval.getAttribute("lon"),
          ele: interval.querySelector("ele").textContent,
          time: new Date(
            Date.parse(interval.querySelector("time").textContent)
          ),
        };
        records.push(instance);
      }
      activity = { name, time, records };
      resolve(activity);
    };
    fileReader.readAsText(file);
  });
  return filePromise;
}

function degToRad(degrees) {
  return Number(degrees) * (Math.PI / 180);
}

const runList = document.getElementById("run-list");

const activities = [];
fileInput.addEventListener("input", async (e) => {
  const files = e.target.files;
  for (file of files) {
    const activity = await parseFile(file);
    activities.push(activity);
  }

  // Sort by date most recent
  activities.sort(function (a, b) {
    return b.time - a.time;
  });

  // For each activity
  for (activity of activities) {
    activity.elevationChange = [];
    activity.timeChange = [];
    activity.distanceChange = [];

    // For each recording in an activity
    for (let i = 0; i < activity.records.length - 1; i++) {
      // Change in elevation and time between 2 recordings
      activity.elevationChange.push(
        Number(activity.records[i + 1].ele) - Number(activity.records[i].ele)
      );
      // Time in seconds
      activity.timeChange.push(
        (activity.records[i + 1].time - activity.records[i].time) / 1000
      );

      // Convert latitude and longitude to radians for calculations
      const lat2 = degToRad(activity.records[i + 1].lat);
      const lat1 = degToRad(activity.records[i].lat);
      const lon2 = degToRad(activity.records[i + 1].lon);
      const lon1 = degToRad(activity.records[i].lon);

      // Distance between to points
      const a =
        Math.sin((lat2 - lat1) / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2;
      const c = 2 * Math.asin(a ** 0.5);

      // radius = √((r1² * cos(B))² + (r2² * sin(B))² ] / [ (r1 * cos(B))² + (r2 * sin(B))²)
      const q1 = (6378.137 ** 2 * Math.cos(lat2)) ** 2;
      const q2 = (6356.752 ** 2 * Math.sin(lat2)) ** 2;
      const q3 = (6378.137 * Math.cos(lat2)) ** 2;
      const q4 = (6356.752 * Math.sin(lat2)) ** 2;

      // radius of earth calculation at specified latitude
      const r =
        ((q1 + q2) / (q3 + q4)) ** 0.5 +
        Number(activity.records[i + 1].ele) / 1000;
      activity.distanceChange.push(c * r);
    }

    // Calculate moving pace in s/km
    activity.movingPace = [];
    for (let i = 0; i < activity.timeChange.length; i++) {
      activity.movingPace.push(
        activity.timeChange[i] / activity.distanceChange[i]
      );
    }

    // Calculate total time by summing time change
    activity.totalTime = activity.timeChange.reduce((current, accumulator) => {
      return accumulator + current;
    });

    // Calculate total distance by summing distance changes
    activity.totalDistance = activity.distanceChange.reduce(
      (current, accumulator) => {
        return accumulator + current;
      }
    );

    // Calculate cumulative distance at each point
    activity.cumulativeDistance = [];
    for (let i = 0; i < activity.distanceChange.length; i++) {
      let sum = 0;
      for (let j = 0; j < i; j++) {
        sum += activity.distanceChange[j]
      }
      activity.cumulativeDistance.push(sum);
    }

    // Calculate average pace in s/km
    activity.averagePace = activity.totalTime / activity.totalDistance;
  }

  console.log(activities);

  // Append to runs list
  for (let i = 0; i < activities.length; i++) {
    const item = document.createElement("li");
    item.textContent = `${activities[i].name} - ${activities[i].time}`;
    item.setAttribute("data-index", i);
    runList.append(item);
  }
});

const runDetail = document.getElementById("run-detail");
runList.addEventListener("click", function (e) {
  const index = e.target.getAttribute("data-index");
  // Remove previous details
  while (runDetail.lastChild) {
    runDetail.removeChild(runDetail.lastChild);
  }
  // Add details for selected
  const title = document.createElement("h1");
  title.textContent = `${activities[index].name} - ${activities[index].time}`;
  runDetail.append(title);

  const distance = document.createElement("p");
  distance.textContent = `Distance: ${activities[index].totalDistance}`;
  runDetail.append(distance);

  const time = document.createElement("p");
  time.textContent = `Time: ${activities[index].totalTime}`;
  runDetail.append(time);

  const pace = document.createElement("p");
  pace.textContent = `Pace: ${activities[index].averagePace}`;
  runDetail.append(pace);

  // Create chart for pace over distance
  const chartContainer = document.createElement("div");
  chartContainer.classList.add("ct-chart")
  chartContainer.classList.add("ct-perfect-fourth")
  runDetail.append(chartContainer)
  const data = {
    // A labels array that can contain any sort of values
    labels: activities[index].cumulativeDistance,
    // Our series array that contains series objects or in this case series data arrays
    series: [
      activities[index].movingPace,
    ]
  };
  new Chartist.Line(".ct-chart", data);
});
