// Call the API to run the model
async function runPipeline() {
    try {
        // Initiate the process with a POST call
        const response = await fetch('https://platform-api.aixplain.com/assets/pipeline/execution/run/67011bf92a621992c944d248', {
            method: 'post',
            body: JSON.stringify({
                data: 'Explain Photosynthesis'
            }),
            headers: {
                'x-api-key': '4b609ad96a66399f6ce3ed3d6322b0e51272eea28dc3650dd21ae11c089ae603', // Your API key here
                'content-type': 'application/json'
            }
        });

        const results = await response.json();
        const urlToPoll = results.url;

        // Polling for the request status
        const pollInterval = setInterval(async () => {
            try {
                const statusResponse = await fetch(urlToPoll, {
                    method: 'get',
                    headers: {
                        'x-api-key': '4b609ad96a66399f6ce3ed3d6322b0e51272eea28dc3650dd21ae11c089ae603', // Your API key here
                        'content-type': 'application/json'
                    }
                });

                const results = await statusResponse.json();

                if (results.completed) {
                    clearInterval(pollInterval);
                    // Process and log results
                    results.data.forEach(async (item) => {
                        console.log(`Node ID: ${item.node_id}`);
                        console.log(`Label: ${item.label}`);
                        console.log(`Path: ${JSON.stringify(item.path, null, 2)}`); // Pretty print path
                        console.log(`Segments: ${JSON.stringify(item.segments, null, 2)}`); // Pretty print segments
                        console.log(`Is Segmented: ${item.is_segmented}`);

                        // Fetch and log the output content
                        await fetchOutput(item.segments);
                    });
                    console.log('--------------------------');
                }
            } catch (error) {
                clearInterval(pollInterval);
                console.error(error);
            }
        }, 5000);
    } catch (error) {
        console.error(error);
    }
}

// Fetch the output content from the response URL
async function fetchOutput(segments) {
    const responseUrl = segments[0].response; // Assuming there's at least one segment
    try {
        const outputResponse = await fetch(responseUrl);
        const outputContent = await outputResponse.text(); // Fetch the text content
        console.log("Generated Output:", outputContent);
    } catch (error) {
        console.error("Error fetching output content:", error);
    }
}

// Run the function
runPipeline();
