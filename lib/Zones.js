const { readJson } = require("./utils.js");
const LIB_FILE_NAME = "DungeonLib.json";

class Zones {
    __shLib
    __cache = {};

    constructor(mod) {
        this.__shLib = readJson(LIB_FILE_NAME);

        this.shToId = this.shToId.bind(this);
        this.ensureDungeonNameCached = this.ensureDungeonNameCached.bind(this, mod);
    }

    shToId(d) {
        for (const [k, v] of Object.entries(this.__shLib)) {
            for (let i = 0; i < v.length; ++i) {
                if (v[i].toLowerCase() === d.toLowerCase()) {
                    return k;
                }
            }
        }
        return null;
    }

    hasSh(id) {
        return this.__shLib.hasOwnProperty(id);
    }

    ensureDungeonNameCached(mod, zones) {
        if (!Array.isArray(zones)) zones = [zones];
        return new Promise((resolve, reject) => {
            let missing = [];
            for (let i = 0; i < zones.length; ++i) {
                if (zones[i] === 'default') continue;
                if (this.isDMessage(zones[i])) {
                    let zone = zones[i].substring(0, 4);
                    if (!this.__cache.hasOwnProperty(zone)) missing.push(Number(zone));
                } 
                if (!this.__cache.hasOwnProperty(zones[i])) missing.push(Number(zones[i]));
            }
            if (missing.length === 0) { resolve(); return; }
            mod.queryData('/StrSheet_Dungeon/String@id=?', [missing], true, false).then(results => {
                for (let i = 0; i < missing.length; ++i) {
                    let found = false;
                    for (let j = 0; j < results.length; ++j) {
                        if (results[j] != null &&
                            results[j].attributes != null &&
                            results[j].attributes.string != null &&
                            results[j].attributes.id == missing[i]
                        ) {
                            this.__cache[missing[i]] = results[j].attributes.string;
                            found = true;
                            break;
                        }
                    }
                    if (!found) this.__cache[missing[i]] = `zone ${missing[i]}`
                }
                resolve();
            }).catch(reject);
        });
    }

    name(zone) {
        if (zone === 'default') return 'default';
        if (this.isDMessage(zone)) return `${this.__cache[zone.substring(0, 4)]} | ${this.__cache[zone]}`
        return this.__cache[zone];
    }

    isDMessage(zone) {
        return Number(zone) > 9999;
    }
}

module.exports = Zones;