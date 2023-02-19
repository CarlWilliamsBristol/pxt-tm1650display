input.onButtonPressed(Button.A, function () {
    inhibit = 1
    TM1650Display.configure("disp1", DigitalPin.P1, DigitalPin.P0)
    TM1650Display.displayOn("disp1", 7)
    inhibit = 0
})
input.onButtonPressed(Button.B, function () {
    inhibit = 1
    TM1650Display.displayOn("disp1", 7)
    inhibit = 0
})
let inhibit = 0
basic.pause(500)
basic.showLeds(`
    . . . . .
    . . . . .
    . . # . .
    . . . . .
    . . . . .
    `)
TM1650Display.configure("disp1", DigitalPin.P1, DigitalPin.P0)
TM1650Display.displayOn("disp1", 7)
TM1650Display.displayClear()
TM1650Display.displayOn("disp1", 7)
inhibit = 0
let counter = 0
basic.forever(function () {
    if (inhibit == 0) {
        TM1650Display.showHex(counter)
        counter += 1
        if (counter > 65535) {
            counter = 0
        }
        if(counter == 50)
        {
            TM1650Display.configure("disp1", DigitalPin.P1, DigitalPin.P0)
            TM1650Display.displayOn("disp1", 7)
        }
    }
})
