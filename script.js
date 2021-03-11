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

fileInput.addEventListener("input", async (e) => {
  const files = e.target.files;
  const activities = [];
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
      activity.elevationChange.push(
        Number(activity.records[i + 1].ele) - Number(activity.records[i].ele)
      );
      activity.timeChange.push(
        activity.records[i + 1].time - activity.records[i].time
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

    // Calculate total distance by summing distance changes
    activity.totalDistance = activity.distanceChange.reduce(
      (current, accumulator) => {
        return accumulator + current;
      }
    );
  }
  console.log(activities);
});
