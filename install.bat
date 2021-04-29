@echo off
if not exist %~dp0\..\..\data\opcodes (echo Invalid location of installation file, expected to be in TeraToolbox\mods\card-setup&&pause&&exit)
if not exist %~dp0\..\..\data\definitions (echo Invalid location of installation file, expected to be in TeraToolbox\mods\card-setup&&pause&&exit)
if not exist %~dp0\install (echo Missing install folder %~dp0install&&pause&&exit)
(echo. && ^
echo C_REMOVE_CARD_COLLECTION_EFFECT 20541 && ^
echo S_REMOVE_CARD_COLLECTION_EFFECT 65443 && ^
echo C_ADD_CARD_COLLECTION_EFFECT 30699 && ^
echo S_ADD_CARD_COLLECTION_EFFECT 39384 && ^
echo C_CARD_PRESET 36656 && ^
echo S_CARD_PRESET 21610 && ^
echo S_CARD_COLLECTION_EFFECTS 45492 && ^
echo S_ADD_CARD_TO_PRESET 49581 && ^
echo S_REMOVE_CARD_FROM_PRESET 53384 && ^
echo S_CARD_DATA 22061 && ^
echo.) >> %~dp0\..\..\data\opcodes\protocol.381290.map
xcopy /s/r/y %~dp0\install %~dp0\..\..\data\definitions >NUL
echo Installation successfull.
pause