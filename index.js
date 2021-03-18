const fs = require('fs');
const path = require('path');

const { deepClone, deepEqual, isObject, colors } = require('./lib/utils.js');
const { CLR } = require('./lib/enums.js');

const Config = require('./lib/Config');
const CardPresets = require('./lib/CardPresets');
const Setups = require('./lib/Setups');
const Zones = require('./lib/Zones');
const Chars = require('./lib/Chars');
const ChangeEmulator = require('./lib/ChangeEmulator');

module.exports = function CardSetup(mod) {
    mod.game.initialize("me");

    const config = new Config(mod);
    const setups = new Setups(mod, config.get());
    const zones = new Zones(mod);
    const chars = new Chars(mod);
    const changeEmulator = new ChangeEmulator(mod, config.get());
    const cardPresets = new CardPresets(mod);

    mod.command.add('setup', { save, remove, migrate, empty, list, use, show, silent, debug, old, });

    // on zone change
    mod.game.me.on('change_zone', (zone, quick) => {
        // setup will be invalid at first spawn after selecting char since setup data is sent after TOPO change
        // TODO onvalid change setup? not sure if this is desired
        if (!setups.valid()) return;
        changeSetup(zone);
    });

    function changeSetup(zone, manual = false) {
        const { serverId, playerId } = mod.game.me;
        zones.ensureDungeonNameCached(zone).then(() => {
            let zoneName = zones.name(zone);
            let setup = setups.get(serverId, playerId, zone);

            if (setup == null) { // zone is not configured

                setup = setup.get(serverId, playerId, 'default'); // try default

                if (setup == null) { // if default is not configured: dont change setup
                    if (!config.get().silent || manual)
                        clrmsg(['No setup configured for', name, `[${zoneName}]`], [CLR.YELLOW, CLR.TEAL, CLR.PURPLE]);
                    return;
                }

                zoneName = 'default';
            }

            let changed = changeEmulator.useSetup(setup, setups.current);

            if (!config.get().silent || manual) {
                if (!changed) clrmsg([`Correct setup detected`, `[${zoneName}]`], [CLR.GREEN, CLR.PURPLE]);
                else clrmsg(['Succesfully changed setup', `[${zoneName}]`], [CLR.GREEN, CLR.PURPLE]);
            }
        })
    }

    // commands
    function save(dun) {
        let { serverId, playerId, name } = mod.game.me;

        let z = parseShorthand(dun);
        if (z === null) return;

        zones.ensureDungeonNameCached(z).then(() => {
            setups.set(serverId, playerId, z);
            clrmsg(['Setup saved for', name, `[${zones.name(z)}]`], [CLR.BLUE, CLR.TEAL, CLR.PURPLE]);
        }).catch(console.error);
    }

    function remove(dun) {
        let { serverId, playerId, name } = mod.game.me;

        let z = parseShorthand(dun);
        if (z === null) return;

        zones.ensureDungeonNameCached(z).then(() => {
            if (setups.del(serverId, playerId, z))
                clrmsg(['Setup removed for', name, `[${zones.name(z)}]`], [CLR.BLUE, CLR.TEAL, CLR.PURPLE]);
            else clrmsg(['No setup found for', name, `[${zones.name(z)}]`], [CLR.BLUE, CLR.TEAL, CLR.PURPLE]);
        }).catch(console.error);
    }

    function migrate(n) {
        let { serverId, playerId, name } = mod.game.me;
        if (n == null) return clrmsg(['Please submit a character name'], [CLR.RED]);
        if (n.toLowerCase() == name.toLowerCase())
            return clrmsg(['Cannot migrate from',name,'to',name,'retard uwu"'], [CLR.RED, CLR.TEAL, CLR.RED, CLR.TEAL, CLR.RED]);
        let id = parseName(n)
        if (id === null) return;
        if (setups.copy(serverId, id, playerId))
            clrmsg(['Succesfully migrated setups from', n, 'to', name], [CLR.BLUE, CLR.TEAL, CLR.BLUE, CLR.TEAL]);
        else clrmsg(['No setups found for', n], [CLR.RED, CLR.TEAL]);
    }

    function empty() {
        let { playerId, serverId, name } = mod.game.me;
        if (setups.empty(serverId, playerId)) clrmsg(['Succesfully removed all setups for', name], [CLR.BLUE, CLR.TEAL]);
        else clrmsg(['No setups found for', name], [CLR.RED, CLR.TEAL]);
    }

    function list(n) {
        let { serverId, playerId } = mod.game.me;

        let id = parseName(n)
        if (id === null) return;
        let list = setups.list(serverId, id);
        if (list === null) return clrmsg(['No setups found for', chars.name(id)], [CLR.RED, CLR.TEAL]);

        clrmsg(['Listing setups for', chars.name(id), ':'], [CLR.BLUE, CLR.TEAL, CLR.BLUE]);
        zones.ensureDungeonNameCached(Object.keys(list)).then(() => {
            for (const [k, v] of Object.entries(list)) {
                clrmsg(['>', `${v.preset+1} - (${v.collectionEffects})`, `[${zones.name(k)}]`], [CLR.BLUE, CLR.YELLOW, CLR.PURPLE]);
            }
        }).catch(console.error);
    };

    function use(dun) {
        let z = parseShorthand(dun);
        if (z === null) return;
        changeSetup(z, true);
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

        if (z === null) clrmsg(['Invalid dungeon shorthand', dun], [CLR.RED, CLR.PURPLE]);
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


    // old save file
    function old() {
        const old_file_name = 'setupData.json';
        if (fs.existsSync(path.join(__dirname, old_file_name))) {
            let data = require(`./${old_file_name}`);
            if (data.servers == null) return;
            for (const [serverId, server] of Object.entries(data.servers)) {
                for (const [playerId, char] of Object.entries(server)) {
                    if (char.setups == null) return;
                    for (const [zone, setup] of Object.entries(char.setups)) {
                        setups.setSetup(serverId, playerId, zone, setup);
                    }
                }
            }
            clrmsg(['Imported old setup data'], [CLR.GREEN]);
        } else clrmsg(['Failed to import old setup data: file not found'], [CLR.RED]);
    }
}