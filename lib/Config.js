const { timeoutWriteJson, readJson, deepEqual } = require('./utils.js');
const FILE_NAME = 'config.json';

class Config {
    __config

    constructor(mod) {
        this.__config = readJson(FILE_NAME) || { silent: false, debug: false };
    }

    set(key, value) {
        if (!deepEqual(this.__config[key], value)) {
            this.__config[key] = value;
            timeoutWriteJson(FILE_NAME, this.__config);
        }
    }

    get() {
        return this.__config;
    }
}

module.exports = Config;