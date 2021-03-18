@echo off
if not exist %~dp0\..\..\data\opcodes (echo Invalid location of installation file, expected to be in TeraToolbox\mods\card-setup&&pause&&exit)
if not exist %~dp0\..\..\data\definitions (echo Invalid location of installation file, expected to be in TeraToolbox\mods\card-setup&&pause&&exit)
if not exist %~dp0\install (echo Missing install folder %~dp0install&&pause&&exit)
(echo. && ^
echo C_REMOVE_CARD_COLLECTION_EFFECT 31406 && ^
echo S_REMOVE_CARD_COLLECTION_EFFECT 25808 && ^
echo C_ADD_CARD_COLLECTION_EFFECT 53541 && ^
echo S_ADD_CARD_COLLECTION_EFFECT 63464 && ^
echo C_CARD_PRESET 20766 && ^
echo S_CARD_PRESET 26302 && ^
echo S_CARD_COLLECTION_EFFECTS 27656 && ^
echo S_ADD_CARD_TO_PRESET 63124 && ^
echo S_REMOVE_CARD_FROM_PRESET 57637 && ^
echo S_CARD_DATA 23259 && ^
echo.) >> %~dp0\..\..\data\opcodes\protocol.379348.map
xcopy /s/r/y %~dp0\install %~dp0\..\..\data\definitions >NUL
echo Installation successfull.
pause