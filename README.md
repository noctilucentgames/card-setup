# Card Setup

## Update v0.2

* Now supports a default setup<br>
`setup save default`

* Now supports card changes for Maknakh and LB-1 in CR<br>
`setup save CR1|CRM|Maknakh`<br>
`setup save CR2|CRLB|LB-1`

## Overview

This module automatically adjusts your card setup based on location. A card setup consists of<br>
1. Your card preset number
2. Your collection effects
> __A setup does not keep track of which cards are in which card preset, that's up to you. If you happen to change the cards inside a preset, keep in mind the module will only change the preset number for you.__

All setup is done through commands inside the game.

## Install

__RUN install.bat to install the necessary defs/opcodes before starting TeraToolbox!__<br>
If installation fails, you can manually add 
1. The contents of the [install]() directory to [TeraToolbox\data\definitions]()
2. The following opcodes to [TeraToolbox\data\opcodes\protocol.380186.map]()
```
C_REMOVE_CARD_COLLECTION_EFFECT 58294
S_REMOVE_CARD_COLLECTION_EFFECT 48550
C_ADD_CARD_COLLECTION_EFFECT 35029
S_ADD_CARD_COLLECTION_EFFECT 28226
C_CARD_PRESET 34365
S_CARD_PRESET 29768
S_CARD_COLLECTION_EFFECTS 44837
S_ADD_CARD_TO_PRESET 53019
S_REMOVE_CARD_FROM_PRESET 25441
S_CARD_DATA 36253
```

## Commands

`setup save`<br>
`setup save <dungeon shorthand>`
> Save your current setup for your current character and your current location or dungeon specified by \<dungeon  shorthand\>.

`setup remove`<br>
`setup remove <dungeon shorthand>`
> Remove setup for your current char and location or dungeon specified by \<dungeon  shorthand\>.

`setup list`<br>
`setup list <char name>`
> Show all setups for your current character or the character specified by \<char  name\>.

`setup empty`
> Remove all setups for your current character.

`setup use`<br>
`setup use <dungeon shorthand>`
> Manually change to the setup corresponding to your current location or dungeon specified by \<dungeon  shorthand\>.

`setup migrate <char name>`
> Migrate all setups from \<char  name\> to your current character. This will overwrite existing setups if present. 
> __Migration doesnt transfer the actual cards in your presets. A setup only contains a preset number.__

`setup show <char name> <preset number>`
> Show card preset \<preset  number\> from \<char  name\> where \<char  name\> is one of your characters on this server.<br>
> This command is comparable to inspecting someones card collection, and more importantly the card preset (but now your alts instead).<br>
> Opening another card collection while one is already opened will close the menu instead. This is a game *'feature'*.

`setup silent`
> Toggle showing messages when changing locations.

## Parameters

`<dungeon shorthand>`
> A shorthand for a specific current endgame dungeon, specified in data/DungeonLib.json. It includes all most common used shorthands ea. CAT, CATN, CKG, KGHM, KGH, etc...

`<char name>` 
> Is one of your characters on this server.