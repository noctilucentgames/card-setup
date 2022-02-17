
class Boss {
    __huntingZoneCache = {};
    __bossCache = {};
    __species = {};

    constructor(mod) {

        // this.shToId = this.shToId.bind(this);

        this.ensureBossCached = this.ensureBossCached.bind(this, mod);
        this.ensureHuntingZoneCached = this.ensureHuntingZoneCached.bind(this, mod);

        this.__importSpecies(mod);
    }

    // zoneToHuntingZone(d) {
    //     for (const [k, v] of Object.entries(this.__shLib)) {
    //         for (let i = 0; i < v.length; ++i) {
    //             if (v[i].toLowerCase() === d.toLowerCase()) {
    //                 return k;
    //             }
    //         }
    //     }
    //     return null;
    // }

    // hasSh(id) {
    //     return this.__shLib.hasOwnProperty(id);
    // }

    __importSpecies(mod) {
        mod.queryData('/StrSheet_Species/String', [], true)
        .then(results => {
            results.forEach(v => {
                this.__species[v.attributes.id] = v.attributes.name;
            })
        })
    }

    // returns undefined if not a specie name
    getSpeciesId(specieName) { 
        return Object.keys(this.__species).find(key => this.__species[key].toLowerCase() === specieName.toLowerCase());
    }

    getSpeciesName(id) {
        return this.__species[id];
    }

    getBossSpecies(huntingZone, boss) {
        if (!this.__existsBoss(huntingZone, boss)) return null;
        return this.__bossCache[huntingZone][boss].species;
    }

    getBossName(huntingZone, boss) {
        if (!this.__existsBoss(huntingZone, boss)) return null;
        return this.__bossCache[huntingZone][boss].name;
    }

    ensureBossCached(mod, huntingZone, boss) {
        return new Promise((resolve, reject) => {
            if (this.__existsBoss(huntingZone, boss)) {resolve(); return;}

            this.__assureBoss(huntingZone, boss);
            // first get name
            mod.queryData('/StrSheet_Creature/HuntingZone@id=?/String@templateId=?', [Number(huntingZone), Number(boss)], true, false)
            .then(results => {
                this.__bossCache[huntingZone][boss].name = null;
                for (let j = 0; j < results.length; ++j) {
                    if (results[j] != null &&
                        results[j].attributes != null &&
                        results[j].attributes.templateId == boss
                    ) {
                        this.__bossCache[huntingZone][boss].name = results[j].attributes.name;
                        break;
                    }
                }
            })
            // then get boss type
            .then(() => {
                return mod.queryData('/NpcData@huntingZoneId=?/Template@id=?', [Number(huntingZone), Number(boss)], true, false)
            })
            .then(results => {
                this.__bossCache[huntingZone][boss].species = -1;
                for (let j = 0; j < results.length; ++j) {
                    if (results[j] != null &&
                        results[j].attributes != null &&
                        results[j].attributes.id == boss
                    ) {
                        this.__bossCache[huntingZone][boss].species = results[j].attributes.speciesId;
                        break;
                    }
                }
            })
            .then(resolve)
            .catch(reject);
        });
    }

    ensureHuntingZoneCached(mod, zones) {
        if (!Array.isArray(zones)) zones = [zones];
        return new Promise((resolve, reject) => {
            let missing = [];
            for (let i = 0; i < zones.length; ++i) {
                if (zones[i] === 'default' || zones[i] > 9999) continue;
                if (!this.__huntingZoneCache.hasOwnProperty(zones[i])) 
                {
                    this.__huntingZoneCache[zones[i]] = -1;
                    missing.push(Number(zones[i]));
                }
            }
            if (missing.length === 0) { resolve(); return; }
            mod.queryData('/HuntingZoneAreaList/Continent@id=?', [missing], true)
            .then(results => {
                mod.log(JSON.stringify(results));
                for (let j = 0; j < results.length; ++j) {
                    if (results[j] != null &&
                        results[j].attributes != null &&
                        missing.indexOf(results[j].attributes.id) > -1 &&
                        this.__arrayExists(results[j].children) && 
                        this.__arrayExists(results[j].children[0].children) &&
                        this.__arrayExists(results[j].children[0].children[0].children) &&
                        results[j].children[0].children[0].children[0].attributes != null
                    ) {
                        this.__huntingZoneCache[results[j].attributes.id] = results[j].children[0].children[0].children[0].attributes.id;
                        break;
                    }
                }
            })
            .then(resolve)
            .catch(reject);
        });
    }

    getHuntingZone(zone) {
        return this.__huntingZoneCache[zone];
    }

    // name(zone) {
    //     if (zone === 'default') return 'default';
    //     if (this.isDMessage(zone)) return `${this.__cache[zone.substring(0, 4)]} | ${this.__cache[zone]}`
    //     return this.__cache[zone];
    // }

    __arrayExists(a) {
        return a != null && a.length > 0;
    }

    __assureBoss(huntingZone, boss) {
        if (!this.__bossCache.hasOwnProperty(huntingZone)) this.__bossCache[huntingZone] = {};
        if (!this.__bossCache[huntingZone].hasOwnProperty(boss)) this.__bossCache[huntingZone][boss] = {};
    }

    __existsBoss(huntingZone, boss) {
        return this.__bossCache.hasOwnProperty(huntingZone) 
        && this.__bossCache[huntingZone].hasOwnProperty(boss);
    }
}

module.exports = Boss;