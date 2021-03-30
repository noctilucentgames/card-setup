@echo off
if not exist %~dp0\..\..\data\opcodes (echo Invalid location of installation file, expected to be in TeraToolbox\mods\card-setup&&pause&&exit)
if not exist %~dp0\..\..\data\definitions (echo Invalid location of installation file, expected to be in TeraToolbox\mods\card-setup&&pause&&exit)
if not exist %~dp0\install (echo Missing install folder %~dp0install&&pause&&exit)
(echo. && ^
echo C_REMOVE_CARD_COLLECTION_EFFECT 58294 && ^
echo S_REMOVE_CARD_COLLECTION_EFFECT 48550 && ^
echo C_ADD_CARD_COLLECTION_EFFECT 35029 && ^
echo S_ADD_CARD_COLLECTION_EFFECT 28226 && ^
echo C_CARD_PRESET 34365 && ^
echo S_CARD_PRESET 29768 && ^
echo S_CARD_COLLECTION_EFFECTS 44837 && ^
echo S_ADD_CARD_TO_PRESET 53019 && ^
echo S_REMOVE_CARD_FROM_PRESET 25441 && ^
echo S_CARD_DATA 36253 && ^
echo.) >> %~dp0\..\..\data\opcodes\protocol.380186.map
xcopy /s/r/y %~dp0\install %~dp0\..\..\data\definitions >NUL
echo Installation successfull.
pause