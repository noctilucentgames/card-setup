const fs = require('fs');
const path = require('path');

const { deepClone, deepEqual, isObject, colors } = require('./lib/utils.js');
const { CLR } = require('./lib/enums.js');

const Config = require('./lib/Config');
const CardPresets = require('./lib/CardPresets');
const Setups = require('./lib/Setups');
const Zones = require('./lib/Zones');
const Chars = require('./lib/Chars');
const Boss = require('./lib/Boss');
const ChangeEmulator = require('./lib/ChangeEmulator');
const opcodes = require('./data/opcodes');

// S_CARD_COLLECTION_EFFECTS l-3e00
// S_CARD_DATA l-4e1a

module.exports = function CardSetup(mod) {

    // auto install
    mod.dispatch.protocol.loadCustomDefinitions(path.resolve(__dirname, 'data', 'defs'));
    if (opcodes[mod.dispatch.protocolVersion]) {
        for (const [name, code] of Object.entries(opcodes[mod.dispatch.protocolVersion])) {
            mod.dispatch.addOpcode(name, code);
        }
    }

    mod.game.initialize("me");

    const config = new Config(mod);
    const setups = new Setups(mod, config.get());
    const zones = new Zones(mod);
    const chars = new Chars(mod);
    const changeEmulator = new ChangeEmulator(mod, config.get());
    const cardPresets = new CardPresets(mod);
    const boss = new Boss(mod);
    let lastBoss = null;
    
    mod.command.add('setup', { save, remove, migrate, empty, list, use, show, silent, debug, });
    
    // on zone change
    mod.game.me.on('change_zone', (zone, quick) => {
        // setup will be invalid at first spawn after selecting char since setup data is sent after TOPO change
        // TODO onvalid change setup? not sure if this is desired
        if (!setups.valid()) return;
        changeSetup(Setups.TYPE.ZONE, zone);
        lastBoss = null;
    });

    // on dungeon message
    mod.hook('S_DUNGEON_EVENT_MESSAGE', 2, event => {
        let arr = /@dungeon:([0-9]*)/.exec(event.message);
        if (arr === null || arr.length < 2) return; // not a dungeon message?
        let id = arr[1];
        if (zones.hasSh(id)) changeSetup(Setups.TYPE.EVENT, id);
    });


    mod.hook('S_BOSS_GAGE_INFO', 3, event => {
        let id = setups.bossKey(event.huntingZoneId, event.templateId);
        if (lastBoss != id) {
            changeSetup(Setups.TYPE.BOSS, id);
        }
    })


    function changeSetup(type, id, manual = false) {
        const { serverId, playerId, name } = mod.game.me;

        lastBoss = type == Setups.TYPE.BOSS ? id : null;
        Promise.resolve()
        .then(() => {
            if (type == Setups.TYPE.ZONE || type == Setups.TYPE.EVENT) return zones.ensureDungeonNameCached(id);
        })
        .then(() => {
            if (type == Setups.TYPE.BOSS) {
                let d = setups.bossValues(id);
                return boss.ensureBossCached(d.huntingZone, d.boss);
            }
        })
        .then(async () => {
            let setup = setups.get(serverId, playerId, type, id);

            if (setup == null && !manual) {
                // try species
                if (type == Setups.TYPE.BOSS) {
                    let d = setups.bossValues(id);
                    let species = boss.getBossSpecies(d.huntingZone, d.boss);
                    if (species > -1) { // if boss has a species
                        type = Setups.TYPE.SPECIES;
                        id = species;
                        setup = setups.get(serverId, playerId, type, id);
                    }
                }

                // try default
                if (type == Setups.TYPE.ZONE) {
                    id = 'default';
                    setup = setups.get(serverId, playerId, type, id);
                }
            }

            // if nothing was found
            if (setup == null) {
                if (!config.get().silent || manual)
                    clrmsg(['No setup configured for', name, `[${typeIdToString(type, id)}]`], [CLR.YELLOW, CLR.TEAL, CLR.PURPLE]);
                return;
            }

            let changed = await changeEmulator.useSetup(setup, setups.current);

            if (!config.get().silent || manual) {
                if (!changed) clrmsg([`Correct setup detected`, `[${typeIdToString(type, id)}]`], [CLR.GREEN, CLR.PURPLE]);
                else clrmsg(['Successfully changed setup', `[${typeIdToString(type, id)}]`], [CLR.GREEN, CLR.PURPLE]);
            }
        }).catch(console.error);
    }

    function parseVar(v) {
        return new Promise ((res, rej) => {
            // first check if str is speciesId or species name
            let speciesId = boss.getSpeciesName(v.join(' ')) ? v : boss.getSpeciesId(v.join(' '));
            if (speciesId != undefined) { res({ type: Setups.TYPE.SPECIES, id: speciesId}); return; }
            
            // check if 2 arguments (location boss) = boss
            if (v.length > 1) {
                let z = parseShorthand(v[0]);
                if (z == null) rej(`invalid input ${v.join(' ')}`)
                let b = Number(v[1]);
                if (!Number.isInteger(b) || b < 1 || b > 20) {
                    rej(`invalid boss number: ${b}`);
                    return;
                }
                zones.ensureDungeonNameCached(z)
                .then(() => boss.ensureHuntingZoneCached(z))
                .then(() => {
                    if (boss.getHuntingZone(z) < 0) {
                        rej(`no huntingzone found for zone ${zones.name(z)} (${v[0]})`)
                        return;
                    }
                    return boss.ensureBossCached(boss.getHuntingZone(z), b * 1000)
                })
                .then(() => {
                    if (boss.getBossName(boss.getHuntingZone(z), b * 1000) == null) rej(`unable to find boss ${b*1000} in dungeon ${zones.name(z)}`);
                    else res({ type: Setups.TYPE.BOSS, id: setups.bossKey(boss.getHuntingZone(z), b * 1000)});
                }).catch(rej)
                return;
            }

            let z = parseShorthand(v[0]);
            if (z == null) { rej(`invalid input ${v.join(' ')}`); return; }

            zones.ensureDungeonNameCached(z)
            .then(() => {
                res( { type: z > 9999 ? Setups.TYPE.EVENT : Setups.TYPE.ZONE, id: z});
            }).catch(rej)
        })
    }


    // commands
    function save(...v) {
        let { serverId, playerId, name } = mod.game.me;
        parseVar(v)
        .then(({ type, id}) => {
            setups.set(serverId, playerId, type, id);
            clrmsg(['Setup saved for', name, `[${typeIdToString(type, id)}]`], [CLR.BLUE, CLR.TEAL, CLR.PURPLE]);
        }).catch((err) => {
            clrmsg(['Unable to save setup:', err], [CLR.BLUE, CLR.RED]);
        })
    }

    function remove(...v) {
        let { serverId, playerId, name } = mod.game.me;
        parseVar(v)
        .then(({ type, id}) => {
            setups.del(serverId, playerId, type, id);
            clrmsg(['Setup saved for', name, `[${typeIdToString(type, id)}]`], [CLR.BLUE, CLR.TEAL, CLR.PURPLE]);
        }).catch((err) => {
            clrmsg(['Unable to remove setup:', err], [CLR.BLUE, CLR.RED]);
        })
    }

    function migrate(n) {
        let { serverId, playerId, name } = mod.game.me;
        if (n == null) return clrmsg(['Please submit a character name'], [CLR.RED]);
        if (n.toLowerCase() == name.toLowerCase())
            return clrmsg(['Cannot migrate from',name,'to',name,'retard uwu"'], [CLR.RED, CLR.TEAL, CLR.RED, CLR.TEAL, CLR.RED]);
        let id = parseName(n)
        if (id === null) return;
        if (setups.copy(serverId, id, playerId))
            clrmsg(['Successfully migrated setups from', n, 'to', name], [CLR.BLUE, CLR.TEAL, CLR.BLUE, CLR.TEAL]);
        else clrmsg(['No setups found for', n], [CLR.RED, CLR.TEAL]);
    }

    function empty() {
        let { playerId, serverId, name } = mod.game.me;
        if (setups.empty(serverId, playerId)) clrmsg(['Successfully removed all setups for', name], [CLR.BLUE, CLR.TEAL]);
        else clrmsg(['No setups found for', name], [CLR.RED, CLR.TEAL]);
    }

    function list(n) {
        let { serverId, playerId } = mod.game.me;

        let id = parseName(n)
        if (id === null) return;
        let list = setups.list(serverId, id);
        if (list === null) return clrmsg(['No setups found for', chars.name(id)], [CLR.RED, CLR.TEAL]);

        clrmsg(['Listing setups for', chars.name(id), ':'], [CLR.BLUE, CLR.TEAL, CLR.BLUE]);
        zones.ensureDungeonNameCached(Object.keys(list[Setups.TYPE.ZONE]).concat(Object.keys(list[Setups.TYPE.EVENT])))
        .then(() => {
            let promises = [];
            Object.keys(list[Setups.TYPE.BOSS]).forEach((v) => {
                let b = setups.bossValues(v);
                promises.push(boss.ensureBossCached(b.huntingZone, b.boss));
            })
            return Promise.all(promises);
        })
        .then(() => {
            Object.keys(Setups.TYPE).forEach((t) => {
                clrmsg([Setups.TYPE[t]], [CLR.GREEN])
                for (const [k, v] of Object.entries(list[Setups.TYPE[t]])) {
                    clrmsg(['>', `${v.preset+1} - (${v.collectionEffects})`, `[${typeIdToString(Setups.TYPE[t], k)}]`], [CLR.BLUE, CLR.YELLOW, CLR.PURPLE]);
                }
            })
        }).catch(console.error);
    };

    function typeIdToString(type, id) {
        if (type == Setups.TYPE.BOSS) {
            const d = setups.bossValues(id);
            return boss.getBossName(d.huntingZone, d.boss);
        }
        if (type == Setups.TYPE.SPECIES) {
            return boss.getSpeciesName(id);
        }
        return zones.name(id);
    }

    function use(...v) {
        parseVar(v)
        .then(({ type, id}) => {
            changeSetup(type, id, true);
        })
        .catch((err) => {
            clrmsg(['Unable to use setup: ', err], [CLR.BLUE, CLR.RED]);
        })
    }

    function show(n, index) {
        let { serverId, name } = mod.game.me;
        
        if (n == null) return clrmsg(['Please submit a character name'], [CLR.RED]);
        let id = parseName(n);
        if (id == null) return;
        
        if (index == null) return clrmsg(['Please submit a preset number'], [CLR.RED]);
        let i = Number(index);
        if (isNaN(i)) return clrmsg(['Please submit a valid preset number'], [CLR.RED]);

        cardPresets.show(serverId, id, chars.name(id), i);
    }

    function silent() {
        let cf = config.get();
        config.set('silent',!cf.silent);
        clrmsg(['Card change messages set to', cf.silent ? 'silent' : 'verbose'], [CLR.BLUE, cf.silent ? CLR.RED : CLR.GREEN]);
    }

    function debug() {
        let cf = config.get();
        config.set('debug',!cf.debug);
        clrmsg(['Debug set to', cf.debug ? 'ON' : 'OFF'], [CLR.BLUE, cf.debug ? CLR.GREEN : CLR.RED]);
    }


    // parsing
    function parseShorthand(dun) {
        let z;
        
        if (dun == null) z = mod.game.me.zone;
        else if (dun.toLowerCase() === 'default') z = 'default';
        else z = zones.shToId(dun);

        // if (z === null) clrmsg(['Invalid dungeon shorthand', dun], [CLR.RED, CLR.PURPLE]);
        return z;
    }

    function parseName(n) {
        let id;
        if (n == null) id = mod.game.me.playerId;
        else {
            id = chars.id(n);
        }
        if (id === null) clrmsg(['Invalid player name', n], [CLR.RED, CLR.TEAL]);
        return id;
    }

    // out
    function clrmsg(...args) {
        mod.command.message(colors(...args));
    }
}