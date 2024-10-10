const fs = require("fs");
const path = require("path");
const zlib = require("zlib")

// You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    const hash = process.argv[4];
    readGitBlob(hash);
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

function readGitBlob(hash){
    const compressed_data = fs.readFileSync(path.join(process.cwd(), ".git", "objects",hash.slice(0,2),hash.slice(2)));
    const Data_Unzip = zlib.inflateSync(compressed_data);
    const ans = Data_Unzip.to_string().split('\0')[1];
    process.stdout.write(ans);
}