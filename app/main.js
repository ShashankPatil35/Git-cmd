const fs = require("fs");
const path = require("path");
const zlib = require("zlib")
const crypto = require("crypto")

const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    readGitBlob();
    break;
  case "hash-object":
    hashGitObject();
    break;
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
  const writeCmd = process.argv[3];
  const file = process.argv[4];

  if(writeCmd !== "-w") return;

  let fileContents = fs.readFileSync(file,'binary');
  fileContents = Buffer.from(fileContents.replace(/\r\n/g, "\n"),"binary");
  // const content = fs.readFileSync(file);

  const header= `blob ${fileContents.length}\x00`;
  // console.log(header)
  // const data = Buffer.concat([Buffer.from(header,'binary'), content]);
  const data = Buffer.concat([Buffer.from(header,"binary"), fileContents]);
  const hash = crypto.createHash("sha1").update(data).digest("hex");
  
  const objDirPath = path.join(__dirname, ".git","objects");
  const hashDirPath = path.join(objDirPath,hash.slice(0,2));
  const filePath = path.join(hashDirPath,hash.slice(2));

  fs.mkdirSync(hashDirPath,{recursive:true});
  fs.writeFileSync(
     filePath, zlib.deflateSync(data));

  console.log(hash);

}