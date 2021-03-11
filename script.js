const geoList = document.getElementById("geo-list")

function getPosition(position) {
    console.log(position)
    const li = document.createElement("li");
    li.textContent = `${new Date(position.timestamp).toLocaleTimeString()}: ${position.coords.latitude}, ${position.coords.longitude}`
    geoList.append(li)
}

// setInterval(() => {
// }, 1000)


navigator.geolocation.watchPosition(getPosition)

const fileInput = document.getElementById("file");

function parseFile(file) {
    const fileReader = new FileReader();
    let instances = []
    let name;
    let time;
    let activity;
    const filePromise = new Promise(function(resolve, reject) {
        fileReader.onload = function () {
            const text = fileReader.result
            const doc = new DOMParser().parseFromString(text, "text/xml");
            name = doc.querySelector("name").textContent;
            time = doc.querySelector("time").textContent;
            const intervals = doc.querySelectorAll("trkpt")
            for (let interval of intervals) {
                const instance = {
                    lat: interval.getAttribute("lat"),
                    lon: interval.getAttribute("lon"),
                    ele: interval.querySelector("ele").textContent,
                    time: new Date(Date.parse(interval.querySelector("time").textContent)),
                }
                instances.push(instance)
    
            }
            activity = ({ name, time, instances })
            resolve(activity);
        }
        fileReader.readAsText(file);
    })
    return filePromise
}


fileInput.addEventListener("input", async (e) => {
    const files = e.target.files
    const activities = [];
    for (file of files) {
        const activity = await parseFile(file);
        console.log("actiity", activity)
        activities.push(activity)
    }
    console.log("activities", activities)
})
