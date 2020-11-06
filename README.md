# pbo.js
A JavaScript library using memory for packing and unpacking Arma's .pbo files.

## Features
- Pack & Unpack a .pbo file

## Requirements
- For a Node.JS project
    1. Node.JS
    2. NPM - Installed by default with Node.js
- For most other projects
    - None!

## Installation
- With NPM
    1. Run command `npm i --save pbo.js`
    2. Done!
- Without NPM
    1. Download the [github source](https://github.com/eelislynne/pbo.js/archive/master.zip)
    2. Unzip master.zip to your desired location
    3. Done!

## Implementation
This is to include the files into your project for use. <br />
- If you're using this with a Node.JS project add this code to the top of your file `const pbojs = require("pbo.js")` <br />
- If you're using this within html add this to `<head>` with the src location changed `<script src="/js/pbo.min.js"></script>`

## Functions
### pbo(buffer)
The first and only parameter is the buffer of the pbo to be used.
#### Node.JS
```javascript
let handler = new pbojs.pbo(buffer)
```
#### HTML
```javascript
let handler = new pbo(buffer)
```
### pbo(buffer).getEntry()
This function returns information about the pbo.
### pbo(buffer).getFiles()
This function returns all the files inside the pbo.
### pbo(buffer).parsePbo()
This function returns a javascript object with the contents of the pbo.
### pbo(buffer).writePbo(pboContents)
This function will create a new pbo with the supplied parameter.

## Examples
1. "example.html" contains a basic example with commented documentation of each function for unpacking.
2. "arma.zone" the folder contains a copy of the html source for https://arma.zone/ Which is used as a source for PBO unpacking. FYI the code is not the prettiest.
