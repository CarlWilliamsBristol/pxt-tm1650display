// tests go here; this will not be compiled when this package is used as an extension.
namespace tm1650DisplayTests {
    export function configAndTurnOn() {
        tm1650Display.configure("display1", DigitalPin.P1, DigitalPin.P0)
        tm1650Display.displayOn("display1", 6)
        tm1650Display.setSpeed(115200)
        tm1650Display.showString("HEL0")
        tm1650Display.configure("display2", DigitalPin.P3, DigitalPin.P2)
        tm1650Display.displayOn("display2", 2)  /* Display on P1, P0 shouldn't change! */
        tm1650Display.showString("D-2")
        basic.pause(1000)
        tm1650Display.displayOff() /* Display on P1, P0 shouldn't change */

        /* Set current display to display1 and reduce brightness, then ramp brightness up */
        /* Note that it should start at max, drop to min and then ramp up - 0 means "8"  */
        tm1650Display.displayOn("display1", 3)
        for( let i = 0; i < 8 ; i++ ){
            basic.pause(300)
            tm1650Display.displayOn("display1", i)
        }
        tm1650Display.displayClear()
    }
    export function testShowInteger() {
        for( let i = 0 ; i < 1235 ; i = i + 2 ) {
            tm1650Display.showInteger(i)
        }
        basic.pause(1000)
        tm1650Display.showInteger(-1)
        basic.pause(1000)
        tm1650Display.showInteger(-999)
        basic.pause(1000)
        tm1650Display.showString("----")
        tm1650Display.showInteger(-1000)
        basic.pause(1000)
        tm1650Display.showInteger(9999)
        basic.pause(1000)
        tm1650Display.showString("----")
        tm1650Display.showInteger(10000)
        basic.pause(1000)
    }
    export function testShowChar() {
        let charset : string = " 0123456789ABCDEFGHIJLnopqrtu-*"
        let len : number  = charset.length
        let i : number = 0
        for( let j = 0 ; j < 10 ; j++ ){
            for (i = 0; i < len ; i+=4 ){
                basic.pause(200)
                for(let k = 0 ; k < 4 ; k++ ){
                    if ((i + k) < len){
                        tm1650Display.showChar(k, charset.charCodeAt(i+k))
                    } else {
                        tm1650Display.showChar(k, charset.charCodeAt((i + k)-len))
                    }
                }
            }
        }
    }
    function kitt() {
        tm1650Display.displayOn("disp2", 6)
        tm1650Display.displayClear()
        tm1650Display.displayOn("disp1", 6)
        tm1650Display.displayClear()
        for (let index = 0; index <= 3; index++) {
            tm1650Display.showChar(index, 48)
            basic.pause(50)
            tm1650Display.showChar(index, 32)
        }
        tm1650Display.displayOn("disp2", 6)
        for (let index = 0; index <= 3; index++) {
            tm1650Display.showChar(index, 48)
            basic.pause(50)
            tm1650Display.showChar(index, 32)
        }
        basic.pause(75)
        for (let index = 0; index <= 3; index++) {
            tm1650Display.showChar(3 - index, 48)
            basic.pause(50)
            tm1650Display.showChar(3 - index, 32)
        }
        tm1650Display.displayOn("disp1", 6)
        for (let index = 0; index <= 3; index++) {
            tm1650Display.showChar(3 - index, 48)
            basic.pause(50)
            tm1650Display.showChar(3 - index, 32)
        }
    }
    function countHexDec(startnum: number, to: number, delay: number, inc: number) {
        let value = startnum
        if (delay == 0) {
            while (value <= to) {
                tm1650Display.displayOn("disp1", 6)
                tm1650Display.showInteger(value)
                tm1650Display.displayOn("disp2", 6)
                tm1650Display.showHex(value)
                value += inc
            }
        } else {
            while (value <= to) {
                tm1650Display.displayOn("disp1", 6)
                tm1650Display.showInteger(value)
                tm1650Display.displayOn("disp2", 6)
                tm1650Display.showHex(value)
                basic.pause(delay)
                value += inc
            }
        }
    }
    function sayHi() {
        let greets:string[] = [
            "H",
            "E",
            "L",
            "L",
            "O",
            "!",
            ""
        ]
        for (let index = 0; index <= 6; index++) {
            tm1650Display.displayOn("disp1", index + 1)
            tm1650Display.displayOn("disp2", index + 1)
            basic.showString("" + (greets[index]))
            basic.pause(200)
        }
    }
    function showPatternAllDigits(pattern: number) {
        tm1650Display.displayOn("disp1", 6)
        tm1650Display.showSegments(0, pattern)
        tm1650Display.showSegments(1, pattern)
        tm1650Display.showSegments(2, pattern)
        tm1650Display.showSegments(3, pattern)
        tm1650Display.displayOn("disp2", 6)
        tm1650Display.showSegments(0, pattern)
        tm1650Display.showSegments(1, pattern)
        tm1650Display.showSegments(2, pattern)
        tm1650Display.showSegments(3, pattern)
    }
    function zerosOff() {
        tm1650Display.displayOn("disp1", 6)
        tm1650Display.showString("0000")
        tm1650Display.displayOn("disp2", 6)
        tm1650Display.showString("0000")
        basic.pause(50)
        tm1650Display.displayOn("disp1", 6)
        tm1650Display.showString(" 000")
        tm1650Display.displayOn("disp2", 6)
        tm1650Display.showString(" 000")
        basic.pause(50)
        tm1650Display.displayOn("disp1", 6)
        tm1650Display.showString("  00")
        tm1650Display.displayOn("disp2", 6)
        tm1650Display.showString("  00")
        basic.pause(50)
        tm1650Display.displayOn("disp1", 6)
        tm1650Display.showString("   0")
        tm1650Display.displayOn("disp2", 6)
        tm1650Display.showString("   0")
    }
    function spinDigits() {
        let pat = 0
        for (let index = 0; index <= 71; index++) {
            pat = pat * 2
            if (pat > 32) {
                pat = 1
            }
            showPatternAllDigits(pat)
            basic.pause(71 - index)
        }
    }
    export function demoTM1650Disp() {
        tm1650Display.configure("disp1", DigitalPin.P1, DigitalPin.P0)
        tm1650Display.configure("disp2", DigitalPin.P13, DigitalPin.P12)
        tm1650Display.displayOn("disp1", 1)
        tm1650Display.setSpeed(190000)
        tm1650Display.showString("HEL0")
        tm1650Display.displayOn("disp2", 1)
        tm1650Display.setSpeed(190000)
        tm1650Display.showString("HEL0")
        while(1) {
            sayHi()
            spinDigits()
            zerosOff()
            countHexDec(0, 7, 75, 1)
            countHexDec(8, 20, 400, 1)
            countHexDec(21, 32, 200, 1)
            countHexDec(33, 55, 100, 1)
            countHexDec(56, 1024, 0, 1)
            countHexDec(1025, 2125, 0, 11)
            countHexDec(2126, 9896, 0, 111)
            countHexDec(9897, 9997, 0, 10)
            countHexDec(9898, 9999, 0, 1)
            basic.pause(2000)
            kitt()
            kitt()
            tm1650Display.displayOn("disp1", 1)
            tm1650Display.showString(" 5A ")
            tm1650Display.showSegments(3, 110)
            tm1650Display.displayOn("disp2", 1)
            tm1650Display.showString(" HI ")
        }
    }
}

/*
/function configure(name: string = "display1", scl: DigitalPin = DigitalPin.P1, sda: DigitalPin = DigitalPin.P0): void ;
/function displayOn(name: string = "display1", brightness: number = 0): void ;
/function displayOff(): void ;
/function displayClear(): void ;
/function showChar(pos: number = 0, c: number = 0): void; 
function showSegments(pos: number = 0, pattern: number = 0): void;
/function showInteger(n: number = 0): void ;
function showDecimal(n: number = 0): void ;
function showHex(n: number = 0): void ;
function toggleDP(pos: number = 0): void ;
/function showString(s: string = "HEL0"): void; 
/function setSpeed(baud: number = 4000): void;
function digitRaw(pos: number = 0): number;
function digitChar(pos: number = 0): number;
function digits(): string ;
*/