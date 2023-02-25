//% weight=100 color=#5C2D91 icon="\uf26c"
namespace tm1650Display {
    const characterBytes: number[] = [
        0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F,  /* 0 - 9 */
        0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71, 0x3D, 0x76, 0x06, 0x0E,  /* A - J */
        0x38, 0x54, 0x74, 0x73, 0x67, 0x50, 0x78, 0x1C, 0x40, 0x63,  /* LnoPQrtu-* (degree) */
        0x00]
    const digitAddress: number[] = [0x68, 0x6A, 0x6C, 0x6E]

    class Tm1650DisplayClass {
        public displayDigitsRaw: number[] = [0, 0, 0, 0]

        constructor(clock: DigitalPin = DigitalPin.P1, data: DigitalPin = DigitalPin.P0) {
            this.reconfigure(clock, data)
        }
        public setSpeed( baud : number = 8333 ) : void {
            /* baud = microseconds per bit, clockLength - clock pulse width */
            let clockLength = 120
            /* Time per bit transmitted is one clock cycle, 2 pulse widths */
            clockLength = 1000000 / baud
            if(clockLength >= 4) {
                this.pulseWidth = Math.floor(clockLength / 2)
                this.halfPulseWidth = Math.floor(clockLength / 4)
            } else {
                this.pulseWidth = 2
                this.halfPulseWidth = 1
            }
        }
        public reconfigure(clock: DigitalPin = DigitalPin.P1, data: DigitalPin = DigitalPin.P0) : void {    
            this.clockPin = clock
            this.dataPin = data
            pins.digitalWritePin(this.clockPin, 0)
            pins.digitalWritePin(this.dataPin, 0)
            pins.setPull(this.dataPin, PinPullMode.PullUp)
            pins.digitalWritePin(this.dataPin, 0)
            this.goIdle()
        }
        public displayOn(brightness: number = 0) : void {
            this.goIdle()
            brightness &= 7
            brightness <<= 4
            brightness |= 1
            this.sendPair(0x48, brightness)
        }
        public displayOff() : void {
            this.sendPair(0x48, 0)
        }
        public displayClear() : void {
            for( let i = 0 ; i < 4 ; i++ ) {
                this.sendPair(digitAddress[i], 0)
                this.displayDigitsRaw[i] = 0
            }
        }
        public showSegments(pos: number = 0, pattern: number = 0) : void {
            pos &= 3
            this.displayDigitsRaw[pos] = pattern
            this.sendPair(digitAddress[pos], this.displayDigitsRaw[pos])
        }
        public showChar(pos: number = 0, c: number = 0) : void {
            let charindex = 30
            pos &= 3
            charindex = this.charToIndex(c)
            if (c == 0x2E) {
                this.displayDigitsRaw[pos] |= 128
            } else {
                this.displayDigitsRaw[pos] = characterBytes[charindex]
            }
            this.sendPair(digitAddress[pos], this.displayDigitsRaw[pos])
        }
        public showCharWithPoint(pos: number = 0, c: number = 0) : void {
            let charindex2 = 30
            pos &= 3
            charindex2 = this.charToIndex(c)
            this.displayDigitsRaw[pos] = characterBytes[charindex2] | 128
            this.sendPair(digitAddress[pos], this.displayDigitsRaw[pos])
        }
        public showString(s: string) : void {
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
        public showInteger(n: number = 0) : void {
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
        public showHex(n: number = 0) : void {
            let j = 3

            if ((n > 0xFFFF) || (n < -32768)) {
                this.showString("Err ")
            } else {
                for( j = 0 ; j < 3 ; j++ ) {
                    this.displayDigitsRaw[j] = 0
                }
                this.displayDigitsRaw[3] = characterBytes[0]
                if (n < 0) {
                    n = 0x10000 + n
                }
               for( j = 3 ; (n != 0) ; j-- ) {
                    this.displayDigitsRaw[j] = characterBytes[n & 15]
                    n >>= 4
                }
                for (j = 0; j < 4; j++) {
                    this.sendPair(digitAddress[j], this.displayDigitsRaw[j])
                }
            }
        }
        public showDecimal(n: number = 0) : void {
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
        public toggleDP(pos: number = 0) : void {
            this.displayDigitsRaw[pos] ^= 128
            this.sendPair(digitAddress[pos], this.displayDigitsRaw[pos])
        }
        public digitRaw(pos : number = 0) : number {
            return this.displayDigitsRaw[pos & 3]
        }
        public digitChar(pos: number = 0) : number {
            let raw=this.displayDigitsRaw[pos&3]
            let c = 0
            let found = 0
            let i = 0
            if(raw == 0){
                c = 32
            }
            while( (i < 30) && ( found == 0) ){
                if( characterBytes[i] == raw) {
                    found = 1
                    if(i < 10){ 
                        c = 0x30 + i
                    } else {
                        if( i < 20 ) {
                            c = 55 + i
                        } else {
                            c = 77
                            if( i > 20 ) {
                                c = c + ( i - 19 )
                                if( i > 25 ){ 
                                    c = c + 1
                                    if( i == 28 ) {
                                        c = 0x2d
                                    }
                                    if( i == 29 ) {
                                        c = 0x2a
                                    }
                                    if( i == 128 ) {
                                        c = 0x2e
                                    }
                                }
                            }
                        }
                    }
                } else {
                    i++
                }
            }
            return c
        }
        private clockPin: DigitalPin = DigitalPin.P1
        private dataPin: DigitalPin = DigitalPin.P0
        private pulseWidth: number = 120
        private halfPulseWidth: number = 60
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

            bitMask = 128
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
            ackBit = pins.digitalReadPin(this.dataPin) /* put pin in read mode with pullup */
            control.waitMicros(this.pulseWidth)
            /* Do one clock */
            pins.digitalWritePin(this.clockPin, 1)
            control.waitMicros(this.pulseWidth)
            ackBit = pins.digitalReadPin(this.dataPin) /* read actual ACK bit */
            pins.digitalWritePin(this.clockPin, 0)
            /* Display takes about half a pulse width to release SDA */
            pins.setPull(this.dataPin, PinPullMode.PullUp)
            while (0 == ackBit) {
                ackBit = pins.digitalReadPin(this.dataPin)
            }
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
        while((found == 0) && ( i < instanceCount )) {
            if (instanceNames[i] == name) {
                found = 1
            } else {
                i++
            }
        }
        return i
    }

    /**
     * Configure a tm1650 based 4-digit 7-segment LED display using the given pins for clock and data.
     * You can have multiple tm1650 displays but they cannot share clock and data lines.
     * The display configured will become the currently selected display.
     * @param a name for the display
     * @param scl the pin to use for the clock signal to the display
     * @param sda the pin to use for the data signal to the display
     */
    //% help=tm1650Display/configure tm1650Display weight=65
    //% blockId=TM1650_configure block="Configure a TM1650 display|named %name| with clock %scl|data %sda"
    //% name.defl="display1" scl.defl=DigitalPin.P1 sda.defl=DigitalPin.P0
    //% parts = "TM1650"
    export function configure(name: string = "display1", scl:DigitalPin = DigitalPin.P1, sda:DigitalPin = DigitalPin.P0 ) : void {
        let index: number = 0

        index = findInstanceIndex(name)
        if (index == instanceCount) {
            instanceNames[index] = name;
            instances[index] = new Tm1650DisplayClass(scl, sda)
            currentInstanceIndex = index
            instanceCount++
        } else {
            instances[index].reconfigure(scl, sda)
            currentInstanceIndex = index
        }
    }

    /**
     * Turn on a tm1650 based 4-digit 7-segment LED display.
     * A display needs to have been configured with the given name
     * The named display will become the currently selected display.
     * Can use this multiple times to select different brightnesses and to change the currently selected display.
     * @param The name of a configured display
     * @param The brightness of the display, 1 to 7 or 0 for maximum.
     */
    //% help=tm1650Display/displayOn tm1650Display weight=55
    //% blockId=TM1650_displayOn block="TM1650 turn on display|named %name|at brightness %brightness"
    //% name.defl="display1"
    //% brightness.min=0 brightness.max=7 brightness.defl=5
    //% parts="TM1650"
    export function displayOn(name: string = "display1", brightness: number = 0) : void {
        let index: number = findInstanceIndex(name)
        if (index != instanceCount) {
            currentInstanceIndex = index
            instances[currentInstanceIndex].displayOn(brightness)
        }
    }

    /**
     * Turn off a tm1650 based 4-digit 7-segment LED display.
     * Does not change the currently selected display (see displayOn() for that.)
     * @param The name of a configured display
     */
    //% help=tm1650Display/displayOff tm1650Display weight=54
    //% blockId=TM1650_displayOff block="TM1650 turn display off"
    //% parts="TM1650"
    export function displayOff() : void {
        if(instanceCount > 0){
            instances[currentInstanceIndex].displayOff()
        }
    }

    /**
     * Clear the currently selected tm1650 based display.
     */
    //% help=tm1650Display/displayClear tm1650Display weight=53
    //% blockId=TM1650_displayClear block="TM1650 clear display"
    //% parts="TM1650"
    export function displayClear() : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].displayClear()
        }
    }

    /**
     * Show a character on the currently selected tm1650 based LED display.
     * Supports space, .-*, digits 0-9, letters A-J plus L,n,o,p,q,r,t,u
     * Asterisk shows as a superscipt o or degree sign. Number 0 can be used
     * for a large O, letter O renders as a small o. Number 5 can be used For
     * letter S.
     * @param The digit position to write to, 0 to 3, 0 is the leftmost.
     * @param The character to show, [ .-*01234567890ABCDEFGHIJLnopqrtu]
     */
    //% help=tm1650Display/showChar tm1650Display weight=50
    //% blockId=tm1650Display_showChar block="TM1650 display character|position %pos|char %c"
    //% pos.min=0 pos.max=3 pos.defl=0 c.min=0 c.max=255 c.defl=0x30
    //% parts="TM1650"
    export function showChar(pos: number = 0, c: number = 0) : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].showChar(pos, c)
        }
    }

    /**
     * Show an arbitrary segment pattern on the currently selected tm1650 based LED display.
     * Segments are designated A to G plus DP for the decimal point. The top segment is
     * A, then they proceed clockwise around the display to F upper left, with G in the middle.
     * The Segment patterm is mapped to bits with bit 0 = A, bit 1 = B etc.
     * Decimal point is bit 7.
     * @param The digit position to write to, 0 to 3, 0 is the leftmost.
     * @param The bit pattern to show (lowest 8 bits map to segments)
     */
    //% help=tm1650Display/showSegments tm1650Display weight=50
    //% blockId=tm1650Display_showSegments block="TM1650 display segment pattern|position %pos|pattern %pattern"
    //% pos.min=0 pos.max=3 pos.defl=0 c.min=0 c.max=255 c.defl=0x30
    //% parts="TM1650"
    export function showSegments(pos: number = 0, pattern: number = 0) : void {
        if (instanceCount > 0) {
            instances[currentInstanceIndex].showSegments(pos, pattern)
        }
    }

    /**
     * Show an integer number on the currently selected tm1650 based LED display.
     * Numbers larger than 9999 or smaller than -999 are ignored as they won't
     * fit in the available digits.
     * @param The number to display
     */
    //% help=tm1650Display/showInteger tm1650Display weight=39
    //% blockId=tm1650Display_showInteger block="TM1650 display integer|%n"
    //% n.min=-999 n.max=9999 n.defl=0
    //% parts="TM1650"
    export function showInteger(n: number = 0) : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].showInteger(n)
        }
    }

    /**
     * Show a decimal number on the currently selected tm1650 based LED display.
     * Numbers larger than 9999 or smaller than -999 are ignored as they won't
     * fit in the available digits. Decimal places that won't fit are omitted.
     * Numbers are right-justified and leading zeros are blanked.
     * @param The number to display
     */
    //% help=tm1650Display/showDecimal tm1650Display weight=40
    //% blockId=tm1650Display_showDecimal block="TM1650 display decimal number|%n"
    //% n.min=-999 n.max=9999 n.defl=0
    //% parts="TM1650"
    export function showDecimal(n: number = 0) : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].showDecimal(n)
        }
    }

    /**
     * Show a hexadecimal number on the currently selected tm1650 based LED display.
     * Numbers larger than 65535 (0xFFFF) or smaller than -32768 are ignored as they won't
     * fit in the available digits. Negative numbers show as positive two's complement. 
     * Numbers are right-justified and leading zeros are blanked.
     * @param The number to display in hexadecimal
     */
    //% help=tm1650Display/showHex tm1650Display weight=38
    //% blockId=tm1650Display_showHex block="TM1650 display hex number|%n"
    //% n.min=-32768 n.max=65535 n.defl=0
    //% parts="TM1650"
    export function showHex(n: number = 0) : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].showHex(n)
        }
    }

    /**
     * Toggle the decimal point for a digit on the currently selected tm1650 based display.
     * @param digit position, 0 to 3. 0 is left-most digit.
     */
    //% help=tm1650Display/toggleDP tm1650Display weight=38
    //% blockId=tm1650Display_toggleDP block="TM1650 toggle decimal point at|digit %pos"
    //% pos.min=0 pos.max=3 pos.defl=0
    //% parts="TM1650"
    export function toggleDP(pos: number = 0) : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].toggleDP(pos)
        }
    }

    /**
     * Display, as far as possible, the given string on the currenly selected tm1650 based display.
     * Characters supported are space and [.-*01234567890ABCDEFGHIJLnopqrtu]. 
     * Decimal points or full stops appearing to the right of a character will be combined into 
     * that character's digit on the display. Asterisk renders as a superscript o or ordinal/degree symbol.
     * Letter o gets a small o, number zero can be used for a large O. Number 5 can be used for letter S. 
     * Letter I renders the same as digit 1. Number 2 can be used for Z. There is no lower-case h. 
     * Strings are displayed left justified and truncated to 4 display digits, which might include one or 
     * more decimal points. Leading or consecutive decimal points will consume display digits, otherwise
     * they combine with other characters. 
     * @param the string to display 
     */
    //% help=tm1650Display/showString tm1650Display weight=45
    //% blockId=tm1650Display_showString block="TM1650 display string|%s"
    //% s.defl="HEL0"
    //% parts="TM1650"
    export function showString(s: string = "HEL0") : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].showString(s)
        }
    }

    /**
     * Set the approximate bit rate of the serial communication with the currently selected tm1650 based display.
     * This becomes less accurate as the speed increases because of "bit-banged" overheads.
     * There is no need to pick "standard" baud rates like 9600 or 19200. Anything much above 100,000 baud uses 
     * minimum delays and there's no practical increase in speed up to the maximum. Actual throughput
     * is always lower because of extra bits and inter-byte delays. These displays appear to work OK up to 
     * the maximum on a V1 and up to 100kbps (setting) on a V2. Speed can be changed at any time after a display is configured.
     * It takes at most 8 bytes to update the whole display, so for most purposes any speed from about 2000 bits/sec is fine,
     * For longer wires in noisy environments, pick lower speeds.
     * @param the desired approximate baud rate, bits per second.
     */
    //% help=tm1650Display/setSpeed tm1650Display weight=25
    //% blockId=tm1650Display_setSpeed block="TM1650 change interface speed|baud %baud"
    //% baud.min=200 baud.max=200000 baud.defl=4000
    //% parts="TM1650"
    export function setSpeed( baud : number = 4000 ) : void {
        if(instanceCount > 0){        
            instances[currentInstanceIndex].setSpeed( baud )
        }
    }

    /**
     * Read the raw segment data for the digit at a given position on the currently selected tm1650 based display. 
     * This doesn't query the display, but rather a host buffer. The number returned has bits set corresponding to 
     * the segments that are turned on, bit 0 = segment A, bit 1 segment B, etc. with bit 7 as the decimal point.
     * @param the digit number, 0 to 3 (0 is the leftmost digit)
     */
    //% help=tm1650Display/digitRaw tm1650Display weight=20
    //% blockId=tm1650Display_digitRaw block="TM1650 get raw segment code for |digit %pos"
    //% pos.min=0 pos.max=3 pos.defl=0
    //% parts="TM1650"
    export function digitRaw( pos: number = 0 ) : number {
        let c = 0
        if (instanceCount > 0) {
            c = instances[currentInstanceIndex].digitRaw(pos)
        }
        return c
    }

    /**
     * Read the character code at a given position on the currently selected tm1650 based display.
     * This doesn't query the display, but rather a host buffer, and it interprets the raw segment 
     * pattern, so it has some quirks. The characters supported are the same as for writing, except
     * that an I or 1 will always return a digit 1, an O or 0 will return a digit 0, and so on.
     * Blank digits and unrecognised segment patterns are returned as zero, so zero doesn't 
     * necessarily mean that the digit in question is blank. 
     * @param the digit number, 0 to 3 (0 is the leftmost digit)
     */
    //% help=tm1650Display/digitChar tm1650Display weight=19
    //% blockId=tm1650Display_digitChar block="TM1650 get char at|digit %pos"
    //% pos.min=0 pos.max=3 pos.defl=0
    //% parts="TM1650"
    export function digitChar(pos: number = 0 ) : number {
        let c = 0
        if (instanceCount > 0) {
            c = instances[currentInstanceIndex].digitChar(pos)
        }
        return c
    }

    /**
     * Read the display digits for the currently selected tm1650 based display.
     * This doesn't query the display, but rather a host buffer, and it interprets the raw segment 
     * pattern, so it has some quirks. The characters supported are the same as for writing, except
     * that an I or 1 will always return a digit 1, an O or 0 will return a digit 0, and so on.
     * Blank digits and unrecognised segment patterns are returned as spaces, so a space doesn't 
     * necessarily mean that the digit in question is actually blank. Returns a 4 character string.
     */
    //% help=tm1650Display/digits tm1650Display weight=19
    //% blockId=tm1650Display_digits block="TM1650 get char at|digit %pos"
    //% pos.min=0 pos.max=3 pos.defl=0
    //% parts="TM1650"
    export function digits(): string {
        let s : string = ""
        let c : number = 0
        if (instanceCount > 0) {
            for( let p = 0 ; p < 4 ; p++ ){
                c = instances[currentInstanceIndex].digitChar(p)
                if( c == 0 ){ 
                    c = 32 
                }
                s = s + String.fromCharCode(c)
            }  
        }
        return s
    }
}