import './environment.js';

export const config = {
    port: process.env.PORT || 3000,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    nvidiaApiKey: process.env.NVIDIA_API_KEY,
};

