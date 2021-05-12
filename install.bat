@echo off
cd /d "%~dp0"

if not exist .\..\..\data\opcodes\ ( echo Invalid location of installation file, expected to be in "TeraToolbox\mods\card-setup\" && goto End )
if not exist .\..\..\data\definitions\ ( echo Invalid location of installation file, expected to be in "TeraToolbox\mods\card-setup\" && goto End )
if not exist .\install\ ( echo Missing "install" folder && goto End )

goto InstallOpcs

:InstallOpcs
    (
        echo.
        echo.C_REMOVE_CARD_COLLECTION_EFFECT 20541
        echo.S_REMOVE_CARD_COLLECTION_EFFECT 65443
        echo.C_ADD_CARD_COLLECTION_EFFECT 30699
        echo.S_ADD_CARD_COLLECTION_EFFECT 39384
        echo.C_CARD_PRESET 36656
        echo.S_CARD_PRESET 21610 
        echo.S_CARD_COLLECTION_EFFECTS 45492
        echo.S_ADD_CARD_TO_PRESET 49581 
        echo.S_REMOVE_CARD_FROM_PRESET 53384 
        echo.S_CARD_DATA 22061
    ) >> .\..\..\data\opcodes\protocol.381290.map
    echo Opcs install success.
    goto InstallDefs

:InstallDefs
    xcopy /s/r/y .\install\ .\..\..\data\definitions\ >NUL
    if "%errorlevel%" neq "0" ( echo Defs install failed. ) else ( echo Defs install success. )
    goto End

:End
    pause