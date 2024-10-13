const fs = require("fs");
const path = require("path");
const zlib = require("zlib")
const crypto     = require("crypto")
// You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    // const hash = process.argv[4];
    readGitBlob();
    break;
  case "hash-object":
    hashGitObject();
    break;
    //here
  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function readGitBlob(){
    const hash = process.argv[4];
    const compressed_data = fs.readFileSync(path.join(process.cwd(), ".git", "objects",hash.slice(0,2),hash.slice(2)));
    const Data_Unzip = zlib.inflateSync(compressed_data);
    const ans = Data_Unzip.toString().split('\0')[1];
    process.stdout.write(ans);
}
function hashGitObject(){
    const file = process.argv[4];
    const {size} = fs.statSync(file);
    const data = fs.readFileSync(file);
    const content= `blob ${size}\0{data.toString()}`;
    const blobSHA = crypto.createHash('sha1').update(content).digest("hex");
    const objDir = blobSHA.subString(0,2);
    const objFile = blobSHA.subString(2);

    fs.mkdirSync(path.join(process.cwd(), ".git","objects",objDir),{
        recursive : true,
    });
    fs.writeFileSync(
        path.join(process.cwd(),".git","objects",objDir,objFile),
        zlib.deflateSync(content),
    );
    process.std.out(`${blob}\n`);

    
}
