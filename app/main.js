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
  case "ls-tree":
    lsTree();
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

// function lsTree(){
//   const isNameOnly = process.argv[3];
//   let hash = '';
//   if(isNameOnly === '--name-only'){
//     hash = process.argv[4];
//   }else{
//     hash = process.argv[3];
//   }

//   if(!hash || hash.length !==40){
//     console.error("Invalid or missing tree hash");
//     return;
//   }

//   const dirName = hash.slice(0,2);
//   const fileName = hash.slice(2);
//   const objectPath = path.join(__dirname,'.git','objects', dirName, fileName);

//   if(!fs.existsSync(objectPath)){
//     console.error('Error : Tree object not found!');
//     return;
//   }
//   // const compressed_data = fs.readFileSync(objectPath);
//   // const inflated = zlib.inflateSync(compressed_data);

//   // const enteries = inflated.toString().split('\x00');
//   // const dataFromTree = enteries.slice(1);
//   // const names = dataFromTree
//   // .filter((line)=>line.includes(' '))
//   // .map((line)=>line.split(' ')[1]);
//   const compressedData = fs.readFileSync(objectPath);
//   const inflated = zlib.inflateSync(compressedData);
//   const entries = inflated.toString('utf-8').split('\x00').slice(1);

//   const names = entries
//     .filter((line) => line.includes(' '))
//     .map((line) => line.split(' ')[2].trim());

//   const response = names.join('\n').concat('\n').replace(/\n\n/g, '\n');
//   process.stdout.write(response);
//   console.log(response)

// }

function lsTree() {
  const isNameOnly = process.argv[3];
  let hash = '';

  if (isNameOnly === '--name-only') {
    hash = process.argv[4];
  } else {
    hash = process.argv[3];
  }

  const dirName = hash.slice(0, 2);
  const fileName = hash.slice(2);
  const objectPath = path.join(process.cwd(), '.git', 'objects', dirName, fileName);

  if (!fs.existsSync(objectPath)) {
    console.error('Error: Tree object not found!');
    return;
  }

  const dataFromFile = fs.readFileSync(objectPath);
  const inflated = zlib.inflateSync(dataFromFile);
  const entries = inflated.toString('utf-8').split('\x00').slice(1);

  const names = entries
    .filter((line) => line.includes(' '))
    .map((line) => line.split(' ')[1]);
  
  const response = names.join('\n').concat('\n').replace(/\n\n/g, '\n');
  process.stdout.write(response);
}
// hashGitObject();