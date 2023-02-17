basic.pause(500)
TM1650Display.configure("disp1", DigitalPin.P1, DigitalPin.P0)
TM1650Display.displayOn("disp1", 5)
TM1650Display.showString("HEL0")
let counter = -32
let initdelay = 15
basic.forever(function () {
    if (initdelay > 0) {
        initdelay += -1
    } else {
        TM1650Display.showHex(counter)
        counter += 1
        if (counter > 65535) {
            counter = 0
        }
    }
    basic.pause(100)
    if (( counter & 1 ) == 0) {
        basic.showLeds(`
            . . . . .
            . . . . .
            . . # . .
            . . . . .
            . . . . .
            `)
    } else {
        basic.showLeds(`
            . . . . .
            . . # . .
            . # # # .
            . . # . .
            . . . . .
            `)
    }
})
