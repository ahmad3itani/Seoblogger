fetch('https://openrouter.ai/api/v1/models')
    .then(r => r.json())
    .then(data => {
        const freeModels = data.data.filter((m: any) => m.pricing.prompt === "0" && m.pricing.completion === "0");
        console.log(freeModels.map((m: any) => m.id).join('\n'));
    });
