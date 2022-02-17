const { timeoutWriteJson, readJson, deepEqual, deepClone, colors } = require('./utils.js');
const FILE_NAME = 'setups.json'

const TYPE = Object.freeze({
    ZONE : "zone",
    BOSS : "boss",
    SPECIES : "species",
    EVENT : "event"
});

class Setups {
    current; setups; __config;
    
    constructor(mod, config) {
        mod.game.initialize("me");

        this.current = { collectionEffects: null, preset: -1 };
        this.setups = readJson(FILE_NAME) || {version: 1.0, data: this.__emptyObject()};
        this.__config = config;
        this.__updateLegacy(mod);
        this.__trackCollectionEffects(mod);
        this.__trackPreset(mod);
    }

    __updateLegacy = (mod) => {
        if (this.setups.version == null) {
            this.setups = {version: 1, data: deepClone(this.setups)};
            Object.keys(this.setups.data).forEach(i => { // server
                Object.keys(this.setups.data[i]).forEach(j => { // character
                    let zone = deepClone(this.setups.data[i][j])
                    this.setups.data[i][j] = this.__emptyObject()
                    for (const [k, v] of Object.entries(zone)) {
                        this.setups.data[i][j][k > 9999 ? TYPE.EVENT : TYPE.ZONE][k] = v;
                    }
                })
            })
            timeoutWriteJson(FILE_NAME, this.setups)
            mod.log('Succesfully transfered old save file to new version');
        }
    }

    __trackCollectionEffects = (mod) => {
        mod.hook('S_CARD_COLLECTION_EFFECTS', 1, event => {
            if (mod.game.me.is(event.gameId)) {
                this.current.collectionEffects = [];
                for (let i = 0; i < event.effects.length; ++i) {
                    this.current.collectionEffects.push(event.effects[i].id);
                }
            }
        });
        mod.hook('S_REMOVE_CARD_COLLECTION_EFFECT', 1, event => {
            if (this.__config.debug) mod.log(`S_REMOVE_CARD_COLLECTION_EFFECT ${event.id}`);
            let i = this.current.collectionEffects.indexOf(event.id);
            if (i > -1) this.current.collectionEffects.splice(i, 1);
            else mod.error("something went wrong... S_REMOVE_CARD_COLLECTION_EFFECT");
        });
        mod.hook('S_ADD_CARD_COLLECTION_EFFECT', 1, event => {
            if (this.__config.debug) mod.log(`S_ADD_CARD_COLLECTION_EFFECT ${event.id}`);
            if (this.current.collectionEffects.length > 1) mod.error("something went wrong... S_ADD_CARD_COLLECTION_EFFECT");
            this.current.collectionEffects.push(event.id);
        });
    }

    __trackPreset = (mod) => {
        mod.hook('S_CARD_PRESET', 1, event => { this.current.preset = event.preset; });
        mod.hook('S_RETURN_TO_LOBBY', 'event', () => { this.current.preset = -1; }); // invalidate preset, since it is not shared across chars
    }

    valid = () => {
        return this.current.collectionEffects !== null && this.current.preset >= 0;
    }

    // store is TYPE
    // id for boss is "huntingzoneid:templateid"
    set = (serverId, playerId, store, id) => {
        if (!this.valid()) return console.log("something went wrong: current setup invalid when saving")

        // make sure there exists an entry for the current player
        this.__assure(serverId, playerId);

        // if setup is already saved, continue
        if (deepEqual(this.setups.data[serverId][playerId][store][id], this.current)) return;

        // copy setup
        this.setups.data[serverId][playerId][store][id] = deepClone(this.current);

        // save setup file
        timeoutWriteJson(FILE_NAME, this.setups);
    }
    get = (serverId, playerId, store, id) => {
        if (!this.__exists(serverId, playerId) || 
            !this.setups.data[serverId][playerId][store].hasOwnProperty(id)) return null;

        return this.setups.data[serverId][playerId][store][id];
    }
    del = (serverId, playerId, store, id) => {
        // if there is no entry for given setup
        if (!this.__exists(serverId, playerId) || 
            !this.setups.data[serverId][playerId][store].hasOwnProperty(id)) return false;

        // remove this entry    
        delete this.setups.data[serverId][playerId][store][id];

        // if no entries left for this player, remove this player
        if (this.__empty(serverId, playerId)) delete this.setups.data[serverId][playerId];

        // save to file
        timeoutWriteJson(FILE_NAME, this.setups);
        return true;
    }

    copy = (serverId, fromId, toId) => {
        if (!this.__exists(serverId, fromId) || this.__empty(serverId, fromId)) return false;
        this.__assure(serverId, toId);

        let newSetup = deepClone(this.setups.data[serverId][toId]);

        Object.values(TYPE).forEach(t => {
            for (const [k, v] of Object.entries(this.setups.data[serverId][fromId][t])) { newSetup[t][k] = v; }
        });
        
        if (!deepEqual(this.setups.data[serverId][toId], newSetup)) {
            this.setups.data[serverId][toId] = newSetup;
            timeoutWriteJson(FILE_NAME, this.setups);
        }
        return true;
    }

    empty = (serverId, playerId) => {
        if (!this.__exists(serverId, playerId) || this.__empty(serverId, playerId)) return false;
        delete this.setups.data[serverId][playerId]
        timeoutWriteJson(FILE_NAME, this.setups);
        return true;
    }

    list = (serverId, playerId) => {
        if (!this.__exists(serverId, playerId) || this.__empty(serverId, playerId)) return null;
        return this.setups.data[serverId][playerId];
    }

    __exists = (serverId, playerId) => {
        return this.setups.data.hasOwnProperty(serverId) && 
        this.setups.data[serverId].hasOwnProperty(playerId);
    }

    __empty = (serverId, playerId) => {
        let length = 0;
        Object.values(TYPE).forEach(store => {
            length += this.setups.data[serverId][playerId][store].length;
        })
        return length < 1;
    }

    __assure = (serverId, playerId) => {
        if (!this.setups.data.hasOwnProperty(serverId)) this.setups.data[serverId] = {};
        if (!this.setups.data[serverId].hasOwnProperty(playerId)) this.setups.data[serverId][playerId] = this.__emptyObject();
    }

    __emptyObject = () => {
        let obj = {};
        Object.values(TYPE).forEach((v) => { obj[v] = {} })
        return obj;
    }

    bossKey = (huntingZone, boss) => {
        return `${huntingZone}:${boss}`;
    }
    bossValues = (key) => {
        let parts = key.split(':');
        return { huntingZone: parts[0], boss: parts[1] };
    }
}

Object.defineProperty(Setups, 'TYPE', {
    value: TYPE,
    writable: false,
});

module.exports = Setups;