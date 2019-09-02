// stream class for dealing with the pbo's raw data
class stream {

    // constructor, pass an ArrayBuffer to open a pbo, empty to create one
    constructor(arrBuffer) {
        if (arrBuffer == null)
            this.buf = [];
        else
            this.buf = arrBuffer;
        this.offset = 0;
    }

    // write a 32 bit int to the buffer
    writeInt(num = 0) {
        let bytes = [];

        for (let i = 0; i < 4; i++) {
            let byte = num & 0xff;
            bytes.push(byte);
            num = (num - byte) / 256;
        }

        this.buf = this.buf.concat(bytes);
        this.offset += 4;
    }

    // read a 32 bit int from the buffer
    getInt() {
        let view = new DataView(this.buf, this.offset);
        this.offset += 4;

        return view.getUint32(0, true);
    }

    // write a string to buffer. Default null terminated
    writeString(str = "", nt = true) {
        let bytes = [];

        for (let i = 0; i < str.length; i++) {
            bytes.push(str.charCodeAt(i));
        }

        if (nt)
            bytes.push(0);

        this.buf = this.buf.concat(bytes);
        this.offset += str.length+1;
    }

    // read a null terminated string from the buffer
    getString() {
        let buf = new Uint8Array(this.buf).subarray(this.offset);

		let byteArr = [];
        for (let byte of buf) {
            if (byte == 0)
                break;

			byteArr.push(byte);
        }
		let str = new TextDecoder("utf-8").decode(new Uint8Array(byteArr));
        this.offset += byteArr.length+1;

        return str;
    }

    // for consistancy with the get methods, alias of writeString
    writeFixedString(str = "", nt = true) {
        this.writeString(str, nt);
    }

    // read a string with specific len from the buffer
    getFixedString(len) {
        let buf = new Uint8Array(this.buf).subarray(this.offset,this.offset+len);
        this.offset += len;

        // callstack can't handle large byte arrays very well
        //if (buf.length > 102400) {

        let byteArr = []; 
		for (let byte of buf) {
			byteArr.push(byte);
		}
		let output = new TextDecoder("utf-8").decode(new Uint8Array(byteArr));
        return output;
 
        //} else
            //return String.fromCharCode.apply(null, buf);
    }

    // finish writing a new pbo, add sha1 hash to the end and make buffer into an ArrayBuffer
    closeWrite() {
        // if sha1 library loaded add null byte before hash, optional
        if (sha1 != undefined) {
            let hash = [0].concat(sha1.array(this.buf));
            this.buf = this.buf.concat(hash);
        }
        this.buf = Uint8Array.from(this.buf).buffer;
        this.offset = 0;
    }

    // output the buffer as a byte string
    hexString() {
        let uintArr = new Uint8Array(this.buf);
        let out = "";
        for (let byte of uintArr) {
            out += ('0' + byte.toString(16)).slice(-2) + " ";
        }
        return out;
    }
}

// pbo class for easy interfacing with the stream class. Allows to read/write to specific sections of the pbo
class pbo {

    // constructor for pbo class, pass ArrayBuffer to file or empty/null for a new pbo
    constructor(arrBuffer = null) {
        this.stream = new stream(arrBuffer);
        this.files = [];
    }
    
    // get the pbo entry header
    getEntry() {
        let entry = {};

        entry.filename = this.stream.getString();
        entry.method = this.stream.getFixedString(4);
        entry.originalSize = this.stream.getInt();
        entry.reserved = this.stream.getInt();
        entry.timestamp = this.stream.getInt();
        entry.dataSize = this.stream.getInt();
        
        return entry;
    }

    // write a pbo entry header
    setEntry(entry) {
        this.stream.writeString(entry.filename);
        this.stream.writeFixedString(entry.method);
        this.stream.writeInt(entry.originalSize);
        this.stream.writeInt(entry.reserved);
        this.stream.writeInt(entry.timestamp);
        this.stream.writeInt(entry.dataSize);
    }

    // read extensions
    getExtensions() {
        let exts = [];
    
        let name;
        do {
            name = this.stream.getString();
            if (name != "")
                exts.push(name);
        } while (name != "");
        
        return exts;
    }

    // write extensions
    setExtensions(extensions) {
        for(let ext of extensions) {
            this.stream.writeString(ext);
        }

    }

    // read all of the files in the pbo data store
    getFileContents() {
        for (let entry of this.files) {
            entry.data = this.stream.getFixedString(entry.size);
        }
    }

    // write data for all the files
    setFileContents(files) {
        for(let entry of files) {
            this.stream.writeFixedString(entry.data, false);
        }
    }

    // get headers for all the files in the pbo
    getFiles() {

        while (true) {
            let filename = this.stream.getString();

            let packing = this.stream.getInt();

            let originalSize = this.stream.getInt();

            // reserved bytes
            this.stream.getInt();

            let timestamp = this.stream.getInt();

            let dataSize = this.stream.getInt();

            // no packing
            if (packing == 0)
                originalSize = dataSize;

            if (filename == "" && packing != 0x56657273) {
                break;
            }

            if (packing == 0x56657273) {
                let str = this.stream.getString();

                while (str != "") {
                    str = this.stream.getString();
                }
            } else {

                this.files.push({
                    name: filename,
                    size: dataSize,
                    originalSize: originalSize,
                    timestamp: timestamp,
                    packing: packing,
                    data: ""
                });
            }
        }

        this.getFileContents();

        return this.files;
    }

    // write headers for files in the pbo
    setFiles(files) {
        // last entry is an empty file to signal the end of the header
        files.push({});
        for (let entry of files) {
            this.stream.writeString(entry.name);
            this.stream.writeInt(entry.packing);
            this.stream.writeInt(entry.originalSize);

            // reserved 4 null bytes
            this.stream.writeInt(0);

            this.stream.writeInt(entry.timestamp);
            this.stream.writeInt(entry.size);
        }
    }

    // read the pbo into a js object and return it
    parsePbo() {
        let pboContents = {};
        pboContents.entry = this.getEntry();
        pboContents.extensions = this.getExtensions();
        pboContents.files = this.getFiles();

        return pboContents;
    }

    // pass a js object with same values as returned from parsePbo, creates a new pbo with the data and returns an instance of pbo class
    writePbo(pboContents) {
        let obj = this;
        
        if (this.stream.buf.length > 0)
            obj = new pbo();
        obj.setEntry(pboContents.entry);
        obj.setExtensions(pboContents.extensions);
        obj.setFiles(pboContents.files);
        obj.setFileContents(pboContents.files);

        obj.stream.closeWrite();

        return obj;
    }
}