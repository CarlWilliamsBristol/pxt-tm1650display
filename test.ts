// tests go here; this will not be compiled when this package is used as an extension.
namespace tm1650DisplayTests {
    export function configAndTurnOn() {
        tm1650Display.configure("display1", DigitalPin.P1, DigitalPin.P0)
        tm1650Display.displayOn("display1", 5)
        tm1650Display.showString("HEL0")
    }
}
