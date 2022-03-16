$(document).ready(function(){

var contents = test_feed["content"];
var contentIds = [];
var contentWordCounts = [];

for(let item of contents) {
	if ("content" in item) {
		let content = item["content"];
		if("id" in content) {
			let id = content["id"];
			if ("bodyHtml" in content) {
				let bodyHtml = content["bodyHtml"];
				contentIds.push(id);
				contentWordCounts.push(findWordCount(bodyHtml));
			}
		}
	}
}

function findWordCount(s) {
	return s.match(/(\w+)/g).length;
}

var chartContext = document.getElementById("chartCount").getContext("2d");
var countData = {
        labels: contentIds,
        datasets: [
            {
                label: "BodyHtml Word Counts Per ID",
                data: contentWordCounts,
                barThickness:'flex',
                backgroundColor: ["#669911", "#119966" ],
                hoverBackgroundColor: ["#66A2EB", "#FCCE56"]
            }]
    };

var countChart = new Chart(chartContext, {
    type: 'bar',
    data: countData,
    options: {
    	indexAxis: 'x',
    	elements: {
    		bar: {
    			borderWidth: 2,
    		}
    	},
    	scaleShowValues: true,
    }
});
})