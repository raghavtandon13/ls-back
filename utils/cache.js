const fs = require("fs").promises;
const path = require("path");

class FileCache {
    constructor(directory = ".cache") {
        this.cacheDir = directory;
    }

    async ensureCacheDirectory() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            if (error.code !== "EEXIST") {
                throw error;
            }
        }
    }

    getCacheFilePath(key) {
        return path.join(this.cacheDir, `${key}.json`);
    }

    async set(key, data) {
        await this.ensureCacheDirectory();
        const cacheItem = {
            data,
            timestamp: new Date().toISOString(),
        };
        await fs.writeFile(this.getCacheFilePath(key), JSON.stringify(cacheItem));
    }

    async get(key) {
        try {
            const filePath = this.getCacheFilePath(key);
            const fileContent = await fs.readFile(filePath, "utf8");
            return JSON.parse(fileContent);
        } catch (error) {
            if (error.code === "ENOENT") {
                // File doesn't exist, cache miss
                return null;
            }
            throw error;
        }
    }

    async getOrSet(key, fetchFunction, options = {}) {
        const { forceRefresh = false } = options;

        if (!forceRefresh) {
            const cachedItem = await this.get(key);
            if (cachedItem && !cachedItem.data.error) {
                return {
                    data: cachedItem.data,
                    timestamp: cachedItem.timestamp,
                    cached: true,
                };
            }
        }

        const data = await fetchFunction();

        // Only cache if there's no error
        if (!data.error) {
            await this.set(key, data);
        }

        return {
            data,
            timestamp: new Date().toISOString(),
            cached: false,
        };
    }
}

module.exports = FileCache;
