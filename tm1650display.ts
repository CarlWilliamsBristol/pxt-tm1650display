//% weight=100 color=#5C2D91 icon="\uf26c"
namespace tm1650Display {
    const characterBytes: number[] = [
        0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F,  /* 0 - 9 */
        0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71, 0x3D, 0x76, 0x06, 0x0E,  /* A - J */
        0x38, 0x54, 0x74, 0x73, 0x67, 0x50, 0x78, 0x1C, 0x40, 0x63,  /* LnoPQrtu-* (degree) */
        0x00]
    const digitAddress: number[] = [0x68, 0x6A, 0x6C, 0x6E]

    class Tm1650DisplayClass {
        public displayDigits: number[] = [0, 0, 0, 0]

        constructor(clock: DigitalPin = DigitalPin.P1, data: DigitalPin = DigitalPin.P0) {
            this.setSpeed( 4000 )
            this.reconfigure( clock, data )
        }
        public setSpeed( baud : number = 4000 ){
            let clockLength = 1000000 / baud   /* microseconds per clock */
            if(clockLength > 10) {
                this.pulseWidth = clockLength / 2
                this.halfPulseWidth = clockLength / 4
                this.shortDelay = clockLength / 10
            }
        }
        public reconfigure(clock: DigitalPin = DigitalPin.P1, data: DigitalPin = DigitalPin.P0) {
            this.clockPin = clock
            this.dataPin = data
            this.goIdle()
            this.sendStart()
            this.goIdle()
        }
        public displayOn(brightness: number = 0) {
            this.goIdle()
            brightness &= 7
            brightness <<= 4
            brightness |= 1
            this.sendPair(0x48, brightness)
        }
        public displayOff() {
            this.sendPair(0x48, 0)
        }
        public displayClear() {
            for( let i = 0 ; i < 4 ; i++ ) {
                this.sendPair(digitAddress[i], 0)
                this.displayDigits[i] = 0
            }
        }
        public showChar(pos: number = 0, c: number = 0) {
            let charindex = 30
            pos &= 3
            charindex = this.charToIndex(c)
            if (c == 0x2E) {
                this.displayDigits[pos] |= 128
            } else {
                this.displayDigits[pos] = characterBytes[charindex]
            }
            this.sendPair(digitAddress[pos], this.displayDigits[pos])
        }
        public showCharWithPoint(pos: number = 0, c: number = 0) {
            let charindex2 = 30
            pos &= 3
            charindex2 = this.charToIndex(c)
            this.displayDigits[pos] = characterBytes[charindex2] | 128
            this.sendPair(digitAddress[pos], this.displayDigits[pos])
        }
        public showString(s: string) {
            let outc: number[] = []
            let dp: number[] = [0, 0, 0, 0]
            let c = 0
            let index = 0
            let di = 0

            for (index = 0, di = 0; (index < s.length) && (di < 4); index++) {
                c = s.charCodeAt(index)
                if (c == 0x2E) {
                    if (di == 0) {
                        outc[di] = 32
                        dp[di] = 1
                        di++
                    } else {
                        if (dp[di - 1] == 0) {
                            dp[di - 1] = 1
                        } else {
                            dp[di] = 1
                            di++
                            outc[di] = 32
                        }
                    }
                } else {
                    outc[di] = c
                    di++
                }
            }
            for (index = 0; index < di; index++) {
                c = outc[index]
                if (dp[index] == 0) {
                    this.showChar(index, c)
                }
                else {
                    this.showCharWithPoint(index, c)
                }
            }
        }
        public showInteger(n: number = 0) {
            let outc2: number[] = [32, 32, 32, 32]
            let i = 3
            let absn = 0

            if ((n > 9999) || (n < -999)) {
                this.showString("Err ")
            } else {
                absn = Math.abs(n)
                if (absn == 0) {
                    outc2[3] = 0x30
                } else {
                    while (absn != 0) {
                        outc2[i] = (absn % 10) + 0x30
                        absn = Math.floor(absn / 10)
                        i = i - 1
                    }
                    if (n < 0) {
                        outc2[i] = 0x2D
                    }
                }
                for (i = 0; i < 4; i++) {
                    this.showChar(i, outc2[i])
                }
            }
        }
        public showHex(n: number = 0) {
            let j = 3

            if ((n > 0xFFFF) || (n < -32768)) {
                this.showString("Err ")
            } else {
                for( j = 0 ; j < 3 ; j++ ) {
                    this.displayDigits[j] = 0
                }
                this.displayDigits[3] = characterBytes[0]
                if (n < 0) {
                    n = 0x10000 + n
                }
               for( j = 3 ; (n != 0) ; j-- ) {
                    this.displayDigits[j] = characterBytes[n & 15]
                    n >>= 4
                }
                for (j = 0; j < 4; j++) {
                    this.sendPair(digitAddress[j], this.displayDigits[j])
                }
            }
        }
        public showDecimal(n: number = 0) {
            let s: string = ""
            let targetlen = 4

            if ((n > 9999) || (Math.abs(n) < 0.001) || (n < -999)) {
                this.showString("Err ")
            } else {
                s = n.toString()
                if (s.includes(".")) {
                    targetlen = 5
                }
                while (s.length < targetlen) {
                    s = " " + s
                }
                this.showString(s)
            }
        }
        public toggleDP(pos: number = 0) {
            this.displayDigits[pos] ^= 128
            this.sendPair(digitAddress[pos], this.displayDigits[pos])
        }

        private clockPin: DigitalPin
        private dataPin: DigitalPin
        private pulseWidth: number 
        private halfPulseWidth: number
        private shortDelay: number
        private charToIndex(c: number) {
            let charCode = 30
            if (c < 30) {
                charCode = c
            } else {
                if ((c > 0x2F) && (c < 0x3A)) {
                    charCode = c - 0x30
                } else {
                    if (c > 0x40) {
                        c &= 0xDF    /* uppercase */
                    }
                    if ((c > 0x40) && (c < 0x4B)) {
                        charCode = c - 0x37
                    } else {
                        if (c == 0x4C) {
                            charCode = 20
                        }
                        if ((c >= 0x4E) && (c <= 0x52)) {
                            charCode = 21 + (c - 0x4E)
                        }
                        if (c == 0x54) {
                            charCode = 26
                        }
                        if (c == 0x55) {
                            charCode = 27
                        }
                        if (c == 0x2D) {
                            charCode = 28
                        }
                        if (c == 0x2A) {
                            charCode = 29
                        }
                    }
                }
            }
            return (charCode)
        }
        private sendPair(byte1: number, byte2: number) {
            this.sendStart()
            this.sendByte(byte1)
            this.sendByte(byte2)
            this.goIdle()
        }
        private sendStart() {
            /* Clock and data both start at 1 */
            pins.digitalWritePin(this.dataPin, 0)
            control.waitMicros(this.pulseWidth)
            pins.digitalWritePin(this.clockPin, 0)
            control.waitMicros(this.shortDelay)
        }
        private goIdle() {
            pins.digitalWritePin(this.clockPin, 1)
            control.waitMicros(this.pulseWidth)
            pins.digitalWritePin(this.dataPin, 1)
            control.waitMicros(this.pulseWidth)
        }
        private sendByte(byte: number) {
            /* The idle state has both clock (SCL) and data (SDA) HIGH.     */
            /* In this function, SCL will start and end LOW, SDA unknown    */
            /* Data are clocked out MSB first. 8 bits are clocked out,      */ 
            /* latched by the display on the falling edge of SCL. A final   */
            /* ninth clock is sent to allow the display to send an ACK bit. */
            let bitMask = 128
            let ackBit = 0      /* Debug only - discarded */

            while (bitMask != 0) {
                control.waitMicros(this.halfPulseWidth)
                if ((byte & bitMask) == 0) {
                    pins.digitalWritePin(this.dataPin, 0)
                } else {
                    pins.digitalWritePin(this.dataPin, 1)
                }
                control.waitMicros(this.halfPulseWidth)
                pins.digitalWritePin(this.clockPin, 1)
                control.waitMicros(this.pulseWidth)
                pins.digitalWritePin(this.clockPin, 0)
                bitMask >>= 1
            }
            /* Clock is now low and we want the ACK bit so this time read SDA */
            /* SDA is unknown, give a brief delay then drop data to zero */
            control.waitMicros(this.shortDelay)
            pins.digitalWritePin(this.dataPin, 0)
            control.waitMicros(this.pulseWidth)
            /* Do one clock */
            pins.digitalWritePin(this.clockPin, 1)
            control.waitMicros(this.pulseWidth)
            pins.digitalWritePin(this.clockPin, 0)
            /* Display takes 120+ microseconds to send ack */
            control.waitMicros(this.halfPulseWidth + this.shortDelay)
            ackBit = pins.digitalReadPin(this.dataPin)
            pins.digitalWritePin(this.dataPin, 0)
            control.waitMicros(this.halfPulseWidth)
        }
    }
    let instanceNames: string[] = []
    let instanceCount: number = 0
    let instances: Tm1650DisplayClass[] = []
    let currentInstanceIndex: number = 0;

    function findInstanceIndex(name: string) {
        let found = 0;
        let i = 0;
        for (i = 0; (found == 0) && i < instanceCount; ++i) {
            if (instanceNames[i] == name) {
                found = 1
            }
        }
        return i
    }

    //% help=tm1650Display/configure tm1650Display weight=65
    //% blockId=TM1650_configure block="Configure a TM1650 display|named %name| with clock %scl|data %sda"
    //% name.defl="display1"
    //% parts = "TM1650"
    export function configure(name: string = "display1", scl:DigitalPin = DigitalPin.P1, sda:DigitalPin = DigitalPin.P0 ) {
        let index: number = 0

        index = findInstanceIndex(name)
        if (index == instanceCount) {
            instanceNames[instanceCount] = name;
            instances[instanceCount] = new Tm1650DisplayClass(scl, sda)
            currentInstanceIndex = index
            instanceCount++
        } else {
            instances[index].reconfigure(scl, sda)
            currentInstanceIndex = index
        }
    }

    //% help=tm1650Display/displayOn tm1650Display weight=55
    //% blockId=TM1650_displayOn block="TM1650 turn on display|named %name|at brightness %brightness"
    //% name.defl="display1"
    //% brightness.min=0 brightness.max=7 brightness.defl=5
    //% parts="TM1650"
    export function displayOn(name: string = "display1", brightness: number = 0) {
        let index: number = findInstanceIndex(name)
        if (index != instanceCount) {
            currentInstanceIndex = index
            instances[currentInstanceIndex].displayOn(brightness)
        }
    }

    //% help=tm1650Display/displayOff tm1650Display weight=54
    //% blockId=TM1650_displayOff block="TM1650 turn display off"
    //% parts="TM1650"
    export function displayOff() {
        instances[currentInstanceIndex].displayOff()
    }

    //% help=tm1650Display/displayClear tm1650Display weight=53
    //% blockId=TM1650_displayClear block="TM1650 clear display"
    //% parts="TM1650"
    export function displayClear() {
        instances[currentInstanceIndex].displayClear()
    }

    //% help=tm1650Display/showChar tm1650Display weight=50
    //% blockId=tm1650Display_showChar block="TM1650 display character|position %pos|char %c"
    //% pos.min=0 pos.max=3 pos.defl=0 c.min=0 c.max=255 c.defl=0x30
    //% parts="TM1650"
    export function showChar(pos: number = 0, c: number = 0) {
        instances[currentInstanceIndex].showChar(pos, c)
    }

    //% help=tm1650Display/showInteger tm1650Display weight=39
    //% blockId=tm1650Display_showInteger block="TM1650 display integer|%n"
    //% n.min=-999 n.max=9999 n.defl=0
    //% parts="TM1650"
    export function showInteger(n: number = 0) {
        instances[currentInstanceIndex].showInteger(n)
    }

    //% help=tm1650Display/showDecimal tm1650Display weight=40
    //% blockId=tm1650Display_showDecimal block="TM1650 display decimal number|%n"
    //% n.min=-999 n.max=9999 n.defl=0
    //% parts="TM1650"
    export function showDecimal(n: number = 0) {
        instances[currentInstanceIndex].showDecimal(n)
    }

    //% help=tm1650Display/showHex tm1650Display weight=38
    //% blockId=tm1650Display_showHex block="TM1650 display hex number|%n"
    //% n.min=-32768 n.max=65535 n.defl=0
    //% parts="TM1650"
    export function showHex(n: number = 0) {
        instances[currentInstanceIndex].showHex(n)
    }

    //% help=tm1650Display/toggleDP tm1650Display weight=38
    //% blockId=tm1650Display_toggleDP block="TM1650 toggle decimal point at|digit %pos"
    //% pos.min=0 pos.max=3 pos.defl=0
    //% parts="TM1650"
    export function toggleDP(pos: number = 0){
        instances[currentInstanceIndex].toggleDP(pos)
    }

    //% help=tm1650Display/showString tm1650Display weight=45
    //% blockId=tm1650Display_showString block="TM1650 display string|%s"
    //% s.defl="HEL0"
    //% parts="TM1650"
    export function showString(s: string = "    ") {
        instances[currentInstanceIndex].showString(s)
    }

    //% help=tm1650Display/setSpeed tm1650Display weight=25
    //% blockId=tm1650Display_setSpeed block="TM1650 change interface speed|baud %baud"
    //% baud.min=200 baud.max=100000 baud.defl=4000
    //% parts="TM1650"
    export function setSpeed( baud : number = 4000 ){
         instances[currentInstanceIndex].setSpeed( baud )
    }
}